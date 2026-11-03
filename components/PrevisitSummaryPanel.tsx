"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { previsitError, type PrevisitDetail, type PrevisitOperation } from "@/lib/previsit";

export function PrevisitSummaryPanel({ userId, patientId }: { userId: string; patientId?: string }) {
  const [days, setDays] = useState(14);
  const [operation, setOperation] = useState<PrevisitOperation | null>(null);
  const [detail, setDetail] = useState<PrevisitDetail | null>(null);
  const [requestId, setRequestId] = useState("");
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [reading, setReading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reload, setReload] = useState(0);
  const requestKey = useRef("");
  const postAbort = useRef<AbortController | null>(null);
  const storageKey = `previsit:${userId}:${patientId ?? "self"}`;
  const pending = posting || reading || operation?.jobStatus === "QUEUED" || operation?.jobStatus === "RUNNING";

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey) ?? "";
    setReading(!!stored); setRequestId(stored);
    return () => postAbort.current?.abort();
  }, [storageKey]);

  const load = useCallback(async (id: string, signal: AbortSignal) => {
    const row = await api<PrevisitOperation>(`/api/ai-operations/${encodeURIComponent(id)}`, { signal });
    let result: PrevisitDetail | null = null;
    if (row.jobStatus === "SUCCEEDED" && row.summaryId) {
      result = await api<PrevisitDetail>(`/api/previsit-summaries/${encodeURIComponent(row.summaryId)}`, { signal });
    }
    if (signal.aborted) return row;
    setOperation(row); setDetail(result); setReading(false); setMessage("");
    return row;
  }, []);

  useEffect(() => {
    if (!requestId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    let attempts = 0;
    setPaused(false);
    async function tick() {
      try {
        const row = await load(requestId, controller.signal);
        if (controller.signal.aborted) return;
        failures = 0;
        if (row.jobStatus === "SUCCEEDED" || row.jobStatus === "FAILED") return;
      } catch (error) {
        if (controller.signal.aborted) return;
        failures++;
        // 조회 실패나 권한 변경 시 이전 본문을 남기지 않는다.
        setDetail(null); setReading(false); setMessage(previsitError(error));
        if (failures >= 3) { setPaused(true); return; }
      }
      if (++attempts >= 150) {
        setPaused(true); setMessage("요약이 지연되고 있어요. 상태를 다시 불러와 주세요."); return;
      }
      timer = setTimeout(tick, 2000);
    }
    void tick();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [requestId, reload, load]);

  async function create() {
    if (posting || (pending && !paused)) return;
    postAbort.current?.abort();
    const controller = new AbortController(); postAbort.current = controller;
    if (!requestKey.current) requestKey.current = crypto.randomUUID();
    setPosting(true); setMessage(""); setDetail(null);
    try {
      const result = await api<{ requestId: string; statusUrl: string }>("/api/previsit-summaries", {
        method: "POST", signal: controller.signal,
        headers: { "Idempotency-Key": requestKey.current },
        body: JSON.stringify({ ...(patientId ? { patientId } : {}), windowDays: days })
      });
      if (controller.signal.aborted) return;
      sessionStorage.setItem(storageKey, result.requestId);
      requestKey.current = ""; setRequestId(result.requestId);
      setOperation({ requestId: result.requestId, operationType: "PREVISIT_SUMMARY", jobStatus: "QUEUED", resultStatus: null, summaryId: null, retryable: false, errorCode: null }); setReload(n => n + 1);
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof ApiRequestError && error.status === 409) requestKey.current = "";
        setMessage(previsitError(error));
      }
    } finally {
      if (!controller.signal.aborted) setPosting(false);
    }
  }

  return <div className="previsit-panel">
    <section className="previsit-card">
      <label htmlFor="previsit-days">요약할 기간</label>
      <select id="previsit-days" value={days} disabled={!!pending && !paused} onChange={e => {
        setDays(Number(e.target.value)); requestKey.current = "";
      }}>
        <option value={7}>최근 7일</option><option value={14}>최근 14일</option><option value={30}>최근 30일</option>
      </select>
      <p>작성한 건강기록에서 진료 전에 함께 확인할 내용을 정리해요. 기록을 수정·삭제하면 요약을 다시 만들어 주세요.</p>
      <button className="btn primary" disabled={!!pending && !paused} onClick={create}>
        {posting ? "요약 요청 중…" : "현재 기록으로 요약 만들기"}
      </button>
    </section>
    {message && <p role="alert" className="previsit-notice">{message}</p>}
    {pending && !paused && <section className="previsit-card" role="status">
      <strong>{operation?.jobStatus === "RUNNING" ? "건강기록을 정리하고 있어요" : "요약 요청을 확인하고 있어요"}</strong>
      <p>화면을 나갔다 돌아와도 마지막 요청을 다시 확인할 수 있어요.</p>
    </section>}
    {operation?.jobStatus === "FAILED" && <section className="previsit-card" role="alert">
      <strong>요약을 만들지 못했어요</strong>
      <p>{operation.errorCode === "SOURCE_UNAVAILABLE" ? "연결 상태나 원본 기록이 변경됐어요. 확인 후 새로 요청해 주세요."
        : operation.errorCode === "AI_API_KEY_MISSING" ? "요약 서비스 설정이 아직 준비되지 않았어요."
        : "잠시 후 현재 기록으로 다시 요청해 주세요."}</p>
    </section>}
    {requestId && <button className="btn" onClick={() => setReload(n => n + 1)}>요약 상태 다시 불러오기</button>}
    {detail && <section className="previsit-card previsit-result">
      <div className="previsit-result-label">{operation?.resultStatus === "INSUFFICIENT" ? "요약할 기록이 없어요" : `최근 ${detail.windowDays}일 요약`}</div>
      <h2>진료 전에 함께 확인해요</h2>
      <p className="previsit-text">{detail.summary}</p>
      <p className="previsit-disclaimer">AI가 사용자 기록을 정리한 참고 자료예요. 진단이나 처방을 대신하지 않으며 의료진과 함께 확인해 주세요.</p>
      {detail.sourceRecords.length > 0 && <details><summary>요약에 사용한 건강기록 {detail.sourceRecords.length}건</summary>
        {detail.sourceRecords.map(source => <article className="previsit-source" key={source.healthRecordId}>
          <time>{new Date(source.recordedAt).toLocaleString("ko-KR")}</time><p>{source.content}</p>
        </article>)}
      </details>}
    </section>}
  </div>;
}
