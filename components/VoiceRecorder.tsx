"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { type VoiceJob, voiceDetail, voiceError, voiceLabels, voiceListPath, voicePending, uploadVoice } from "@/lib/voice";
import "./voice-recorder.css";

const MAX_BYTES = 20 * 1024 * 1024;
const failureText: Record<string,string> = {
  NO_SPEECH:"말소리를 찾지 못했어요. 조용한 곳에서 다시 녹음해 주세요.",
  AUDIO_INVALID:"읽을 수 없는 음성이에요. 다른 파일을 선택하거나 다시 녹음해 주세요.",
  TRANSCRIPT_TOO_LONG:"음성이 너무 길어요. 짧게 나눠서 다시 녹음해 주세요.",
};

export function VoiceRecorder({ patientId, visitId, disabled = false, readOnly = false, onSaved, onBusyChange }: {
  patientId?: string; visitId?: string; disabled?: boolean; readOnly?: boolean;
  onSaved: () => void; onBusyChange?: (value: boolean) => void;
}) {
  const prefix = useId();
  const [file,setFile] = useState<File | null>(null);
  const [key,setKey] = useState("");
  const [consent,setConsent] = useState(false);
  const [job,setJob] = useState<VoiceJob | null>(null);
  const [jobs,setJobs] = useState<VoiceJob[]>([]);
  const [draft,setDraft] = useState("");
  const [dirty,setDirty] = useState(false);
  const [stale,setStale] = useState(false);
  const [recording,setRecording] = useState(false);
  const [seconds,setSeconds] = useState(0);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [listError,setListError] = useState("");
  const [message,setMessage] = useState("");
  const [reload,setReload] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const uploading = useRef<AbortController | null>(null);
  const maxSeconds = visitId ? 15 * 60 : 5 * 60;
  const locked = disabled || busy || recording;
  const jobId = job?.transcriptionId;
  const processing = voicePending(job);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; uploading.current?.abort();
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(track=>track.stop());
    };
  },[]);
  useEffect(() => {
    onBusyChange?.(busy || recording || !!file || dirty);
    return () => onBusyChange?.(false);
  },[busy,recording,file,dirty,onBusyChange]);
  useEffect(() => {
    if (!(busy || recording || file || dirty)) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload",guard);
    return ()=>window.removeEventListener("beforeunload",guard);
  },[busy,recording,file,dirty]);
  useEffect(() => {
    const controller = new AbortController(); setListError("");
    api<VoiceJob[]>(voiceListPath(patientId,visitId),{signal:controller.signal})
      .then(result=>{ if(!controller.signal.aborted) setJobs(result); })
      .catch(reason=>{ if(!controller.signal.aborted){setJobs([]);setListError(voiceError(reason));} });
    return ()=>controller.abort();
  },[patientId,visitId,reload]);
  useEffect(() => {
    if (!jobId || !processing) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let failures=0; let polls=0;
    async function poll() {
      try {
        const next=await voiceDetail(jobId!,controller.signal);
        if(controller.signal.aborted) return;
        setJob(next); failures=0;
        if(!voicePending(next)) {setReload(value=>value+1);return;}
        if(++polls>=300){setError("변환이 지연되고 있어요. 나중에 다시 불러와 확인할 수 있어요.");return;}
      } catch(reason) {
        if(controller.signal.aborted)return;
        if(reason instanceof ApiRequestError && [401,403,404].includes(reason.status)){setJob(null);setJobs([]);setDraft("");setError(voiceError(reason));return;}
        if(++failures>=3){setError(voiceError(reason));return;}
      }
      if(!controller.signal.aborted)timer=setTimeout(poll,2000);
    }
    timer=setTimeout(poll,1500);
    return ()=>{controller.abort();clearTimeout(timer);};
  },[jobId,processing,reload]);
  useEffect(() => {
    if(job?.status === "DRAFT_READY"){setDraft(job.draftText ?? "");setDirty(false);}
  },[jobId,job?.status]);
  useEffect(() => {
    if(!recording)return;
    const timer=setInterval(()=>setSeconds(current=>current+1),1000);
    return ()=>clearInterval(timer);
  },[recording]);
  useEffect(()=>{if(recording&&seconds>=maxSeconds)recorder.current?.stop();},[recording,seconds,maxSeconds]);

  function selectFile(next: File | null) {
    setError("");setMessage("");
    if(next && (next.size===0 || next.size>MAX_BYTES)){setFile(null);setError("비어 있지 않은 20MB 이하의 음성을 선택해 주세요.");return;}
    setFile(next);setKey(next?crypto.randomUUID():"");
  }
  async function start() {
    if(locked||readOnly||!consent)return;
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder === "undefined"){setError("이 브라우저는 녹음을 지원하지 않아요. 음성 파일을 선택해 주세요.");return;}
    setError("");setBusy(true);
    try {
      const capture=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mounted.current){capture.getTracks().forEach(track=>track.stop());return;}
      stream.current=capture;
      const mime=["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"].find(type=>MediaRecorder.isTypeSupported(type));
      const next=new MediaRecorder(capture,mime?{mimeType:mime}:undefined); const chunks:Blob[]=[]; let size=0;
      next.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);size+=event.data.size;if(size>MAX_BYTES&&next.state==="recording")next.stop();}};
      next.onstop=()=>{
        capture.getTracks().forEach(track=>track.stop());
        if(!mounted.current)return;
        setRecording(false);
        const extension=next.mimeType.includes("mp4")?"m4a":next.mimeType.includes("ogg")?"ogg":"webm";
        selectFile(new File(chunks,`recording.${extension}`,{type:next.mimeType}));
      };
      next.onerror=()=>{capture.getTracks().forEach(track=>track.stop());if(mounted.current){setRecording(false);setError("녹음이 중단됐어요. 파일을 확인하고 다시 시도해 주세요.");}};
      recorder.current=next;next.start(1000);setSeconds(0);setRecording(true);
    } catch {stream.current?.getTracks().forEach(track=>track.stop());if(mounted.current)setError("마이크를 사용할 수 없어요. 권한을 확인하거나 음성 파일을 선택해 주세요.");}
    finally {if(mounted.current)setBusy(false);}
  }
  async function upload() {
    if(locked||readOnly||!file||!consent)return;
    setBusy(true);setError("");const controller=new AbortController();uploading.current=controller;
    try{const result=await uploadVoice(file,key,consent,patientId,visitId,controller.signal);if(mounted.current){setJob(result);setStale(false);setDirty(false);setFile(null);setKey("");setMessage("음성을 올렸어요. 글로 바뀌면 내용을 확인한 뒤 저장해 주세요.");setReload(value=>value+1);}}
    catch(reason){if(mounted.current&&!controller.signal.aborted)setError(voiceError(reason));}
    finally{if(mounted.current)setBusy(false);}
  }
  async function action(kind:"confirm"|"cancel"|"retry"|"refresh") {
    if(locked||!job||(stale&&kind!=="refresh"))return;
    if((kind==="confirm"||kind==="retry")&&readOnly)return;
    if(kind==="cancel"&&!window.confirm("이 음성 초안을 취소할까요? 건강기록에는 저장되지 않아요."))return;
    if(kind==="refresh"&&dirty&&!window.confirm("수정 중인 초안을 지우고 다시 불러올까요?"))return;
    setBusy(true);setError("");setMessage("");
    try {
      let next: VoiceJob;
      if(kind==="cancel"){await api<void>(job.statusUrl,{method:"DELETE"});next=await voiceDetail(job.transcriptionId);}
      else if(kind==="refresh")next=await voiceDetail(job.transcriptionId);
      else next=await api<VoiceJob>(`${job.statusUrl}/${kind}`,{method:"POST",...(kind==="confirm"?{body:JSON.stringify({body:draft,version:job.version})}:{})});
      if(!mounted.current)return;
      setJob(next);setDirty(false);setStale(false);setReload(value=>value+1);
      if(next.status==="DRAFT_READY")setDraft(next.draftText??"");
      if(kind==="confirm"){setMessage("확인한 내용을 건강기록에 저장했어요.");onSaved();}
    } catch(reason){if(mounted.current){setError(voiceError(reason));if(reason instanceof ApiRequestError&&reason.status===409)setStale(true);if(reason instanceof ApiRequestError&&[403,404].includes(reason.status)){setJob(null);setJobs([]);}}}
    finally{if(mounted.current)setBusy(false);}
  }
  const chooseJob = useCallback((next: VoiceJob) => {
    if(dirty&&!window.confirm("작성 중인 초안을 지우고 다른 음성을 볼까요?"))return;
    setJob(next);setDraft(next.draftText??"");setDirty(false);setStale(false);setError("");setMessage("");
  },[dirty]);
  return <section className="voice-panel" aria-label={visitId?"진료실 음성 기록":"음성 건강기록"}>
    <h2>{visitId?"진료실 음성 기록":"말로 건강기록 남기기"}</h2>
    <p className="voice-help">음성을 글로 바꾼 뒤 직접 확인·수정하고 저장해요. 확인 전에는 건강기록에 저장되지 않아요.</p>
    {readOnly?<p>취소된 방문에서는 새 녹음이나 초안 확정을 할 수 없어요.</p>:<>
      <label className="voice-consent"><input type="checkbox" checked={consent} disabled={locked} onChange={event=>setConsent(event.target.checked)}/><span>{visitId?"녹음 전 참석자에게 알리고 동의를 받았으며, 음성 변환을 위한 처리에 동의합니다.":"음성을 글로 바꾸기 위한 녹음 파일 처리에 동의합니다."}</span></label>
      <div className="voice-controls">
        {recording?<button type="button" className="btn-primary" onClick={()=>recorder.current?.stop()}>■ 녹음 마치기 · {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</button>:<button type="button" className="btn-primary" disabled={locked||!consent} onClick={start}>🎙 녹음 시작</button>}
        <label htmlFor={`${prefix}-file`}>또는 음성 파일 선택 <input id={`${prefix}-file`} type="file" accept=".wav,.mp3,.m4a,.webm,.ogg,audio/*" disabled={locked} onChange={event=>{selectFile(event.target.files?.[0]??null);event.target.value="";}}/></label>
      </div>
      <p className="voice-help">녹음 최대 {maxSeconds/60}분 · 파일 최대 20MB · WAV, MP3, M4A, WebM, OGG</p>
      {file&&<div className="voice-selected"><span>{file.name} · {(file.size/1024/1024).toFixed(1)}MB</span><button type="button" className="btn-primary" disabled={locked||!consent} onClick={upload}>{busy?"올리는 중…":"음성을 글로 바꾸기"}</button><button type="button" className="btn-out" disabled={locked} onClick={()=>selectFile(null)}>파일 선택 취소</button></div>}
    </>}
    {message&&<p className="voice-message" role="status">{message}</p>}
    {error&&<p className="voice-error" role="alert">{error}</p>}
    {job&&<article className="voice-job">
      <strong role="status">{voiceLabels[job.status]}</strong>
      {processing&&<p>이 화면을 닫아도 변환 요청은 유지돼요. 아래 최근 음성에서 다시 확인할 수 있어요.</p>}
      {job.status==="FAILED"&&<p>{failureText[job.errorCode??""]??"음성을 변환하지 못했어요. 다시 시도하거나 새로 녹음해 주세요."}</p>}
      {job.status==="DRAFT_READY"&&<><label htmlFor={`${prefix}-draft`}>변환된 내용 확인·수정</label><textarea id={`${prefix}-draft`} rows={6} value={draft} disabled={locked||readOnly||stale} onChange={event=>{setDraft(event.target.value);setDirty(true);}}/><p className="voice-help">{draft.length.toLocaleString()} / 2,000자 · 인식이 틀린 부분을 고쳐 주세요.{draft.length>2000?" 기록할 핵심 내용을 2,000자 이내로 정리해 주세요.":""}</p><button type="button" className="btn-primary" disabled={locked||readOnly||stale||!draft.trim()||draft.length>2000} onClick={()=>action("confirm")}>확인한 내용 기록하기</button></>}
      {job.status==="CONFIRMED"&&<p className="voice-confirmed">{job.confirmedText}</p>}
      <div className="voice-job-actions"><button type="button" className="btn-out" disabled={locked} onClick={()=>action("refresh")}>음성 상태 다시 불러오기</button>
        {job.status==="FAILED"&&!readOnly&&<button type="button" className="btn-out" disabled={locked||stale} onClick={()=>action("retry")}>변환 다시 시도</button>}
        {!["CONFIRMED","CANCELED"].includes(job.status)&&<button type="button" className="btn-out" disabled={locked||stale} onClick={()=>action("cancel")}>초안 취소</button>}
      </div>
    </article>}
    <h3>최근 음성</h3>
    {listError&&<div role="alert"><p>{listError}</p><button type="button" className="btn-out" disabled={locked} onClick={()=>setReload(value=>value+1)}>목록 다시 불러오기</button></div>}
    {!jobs.length&&!listError&&<p className="voice-help">아직 올린 음성이 없어요.</p>}
    <ul className="voice-history">{jobs.map(row=><li key={row.transcriptionId}><button type="button" disabled={locked||!!file} aria-pressed={jobId===row.transcriptionId} onClick={()=>chooseJob(row)}>{voiceLabels[row.status]} · {new Date(row.createdAt).toLocaleString("ko-KR")}</button></li>)}</ul>
  </section>;
}
