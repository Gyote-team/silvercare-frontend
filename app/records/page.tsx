"use client";
import "./records.css";
import { useEffect, useRef, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { api, ApiRequestError, type CareRelation, type HealthRecord, type HealthRecordPage } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const emptyPage: HealthRecordPage = { items: [], nextCursor: null, hasNext: false };

export default function RecordsPage() {
  const { me, loading } = useMe();
  const [targets, setTargets] = useState<CareRelation[]>([]);
  const [patientId, setPatientId] = useState("");
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(emptyPage);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<HealthRecord | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [listLoaded, setListLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const caregiver = me?.role === "CAREGIVER";
  const canWrite = ready && (!caregiver || !!patientId);
  const targetName = caregiver ? targets.find((row) => row.patientId === patientId)?.counterpartName : me?.name;
  const hasTopic = (topic: string) => text.split("\n").some((line) => line.trimStart().startsWith(topic + ":"));

  function toggleTopic(topic: string) {
    setText((current) => {
      const lines = current.split("\n");
      const prefix = topic + ":";
      if (lines.some((line) => line.trimStart().startsWith(prefix))) {
        // 주제 표시만 제거하고 사용자가 작성한 내용은 그대로 남긴다.
        return lines.map((line) => line.trimStart().startsWith(prefix)
          ? line.trimStart().slice(prefix.length).replace(/^ /, "") : line)
          .filter((line, index) => line !== "" || !lines[index].trimStart().startsWith(prefix))
          .join("\n");
      }
      const next = current + (current && !current.endsWith("\n") ? "\n" : "") + prefix + " ";
      return next.length <= 2000 ? next : current;
    });
  }
  const errorMessage = (error: unknown) => {
    if (error instanceof ApiRequestError) {
      if (error.status === 401) return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
      if (error.status === 403) return "이 기록에 접근할 수 없습니다. 개인과의 연결 상태를 확인해 주세요.";
      if (error.status >= 500) return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      return error.message;
    }
    return "처리하지 못했습니다. 다시 시도해 주세요.";
  };
  const listPath = (cursor?: string) => {
    const params = new URLSearchParams();
    if (caregiver) params.set("patientId", patientId);
    if (cursor) params.set("cursor", cursor);
    return "/api/health-records?" + params;
  };

  useEffect(() => {
    if (!me) return;
    if (me.role !== "CAREGIVER") { setReady(true); return; }
    let cancelled = false;
    api<CareRelation[]>("/api/care-relations").then((rows) => {
      if (cancelled) return;
      const active = [...new Map(rows.filter((r) => r.status === "ACTIVE").map((r) => [r.patientId, r])).values()];
      setTargets(active);
      const stored = sessionStorage.getItem(`records-target:${me.id}`);
      setPatientId(active.some((r) => r.patientId === stored) ? stored! : active[0]?.patientId ?? "");
      setReady(true);
    }).catch(() => { if (!cancelled) setMessage("연결된 개인을 불러오지 못했습니다. 페이지를 다시 열어 주세요."); });
    return () => { cancelled = true; };
  }, [me]);

  useEffect(() => {
    const token = ++generation.current;
    setPage(emptyPage); setListLoaded(false); setFetching(false);
    setEditing(null); setText("");
    if (!me || !ready || (caregiver && !patientId)) return;
    if (caregiver) sessionStorage.setItem(`records-target:${me.id}`, patientId);
    setFetching(true);
    const suffix = caregiver ? `?patientId=${encodeURIComponent(patientId)}` : "";
    api<HealthRecordPage>("/api/health-records" + suffix).then((result) => {
      if (token === generation.current) { setPage(result); setListLoaded(true); setMessage(""); }
    }).catch((error) => { if (token === generation.current) setMessage(errorMessage(error)); })
      .finally(() => { if (token === generation.current) setFetching(false); });
    return () => { ++generation.current; };
  }, [me, ready, caregiver, patientId, reload]);

  function changeTarget(target: string) {
    if (target === patientId || busy) return;
    if (text.trim() && !window.confirm("작성 중인 내용이 있습니다. 내용을 지우고 다른 개인으로 전환할까요?")) return;
    ++generation.current;
    setPage(emptyPage); setListLoaded(false); setEditing(null); setText(""); setMessage("");
    setPatientId(target);
  }

  async function save() {
    if (busy || fetching || !text.trim() || !canWrite) return;
    setBusy(true); setMessage("");
    try {
      await api<HealthRecord>(editing ? `/api/health-records/${editing.recordId}` : "/api/health-records", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({ body: text, patientId: caregiver ? patientId : undefined, visitId: editing?.visitId ?? null })
      });
      setText(""); setEditing(null); setMessage("기록을 저장했습니다.");
      try { setPage(await api<HealthRecordPage>(listPath())); setListLoaded(true); }
      catch { setMessage("저장했습니다. 목록은 페이지를 다시 열어 확인해 주세요."); }
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function remove(record: HealthRecord) {
    if (busy || fetching || !window.confirm("이 건강기록을 삭제할까요?")) return;
    setBusy(true);
    try {
      await api<void>(`/api/health-records/${record.recordId}`, { method: "DELETE" });
      if (editing?.recordId === record.recordId) { setEditing(null); setText(""); }
      setMessage("기록을 삭제했습니다.");
      try { setPage(await api<HealthRecordPage>(listPath())); setListLoaded(true); }
      catch { setMessage("삭제했습니다. 목록은 페이지를 다시 열어 확인해 주세요."); }
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function loadMore() {
    if (!page.nextCursor || fetching) return;
    const token = generation.current;
    setFetching(true);
    try {
      const result = await api<HealthRecordPage>(listPath(page.nextCursor));
      if (token === generation.current) setPage((current) => ({ ...result, items: [...current.items, ...result.items] }));
    } catch (error) { if (token === generation.current) setMessage(errorMessage(error)); }
    finally { if (token === generation.current) setFetching(false); }
  }

  async function startEdit(record: HealthRecord) {
    if (busy || fetching) return;
    const token = generation.current;
    setBusy(true);
    try {
      const detail = await api<HealthRecord>(`/api/health-records/${record.recordId}`);
      if (token === generation.current) { setEditing(detail); setText(detail.body); setMessage(""); }
    } catch (error) { if (token === generation.current) setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  if (loading || !me) return <PhoneFrame tab="records"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  return <PhoneFrame tab="records" scrollClassName="records-screen" chatLocked={caregiver} userName={me.name}>
    <header className="records-heading">
    <span className="records-eyebrow">하루하루 쌓이는 건강</span>
    <div className="page-title">{caregiver ? "보호자 건강기록" : "내 건강기록"}</div>
    <p className="records-intro">작은 변화도 놓치지 않도록, 오늘의 몸 상태를 남겨 보세요.</p>
    </header>
    {caregiver ? <section className="card records-target">
      <label htmlFor="record-patient">기록할 개인</label>
      <select id="record-patient" value={patientId} disabled={busy || !ready}
        onChange={(e) => changeTarget(e.target.value)}>
        {!targets.length ? <option value="">연결된 개인이 없습니다</option> : null}
        {targets.map((r) => <option key={r.patientId} value={r.patientId}>{r.counterpartName}</option>)}
      </select>
      {ready && !targets.length ? <p>개인과 연결한 뒤 기록할 수 있어요. 본인 기록은 계정 메뉴에서 개인 계정으로 전환해 주세요.</p> : null}
    </section> : <div className="records-owner"><span className="records-avatar">{me.name.slice(0,1)}</span><div><strong>{me.name} 님의 건강기록</strong><span>보호자 연결 없이도 혼자 기록하고 관리할 수 있어요.</span></div></div>}
    {canWrite ? <section className="records-compose">
      <div className="records-compose-top"><span className="records-compose-icon" aria-hidden="true">✎</span><span>{editing ? "기록을 다듬어요" : "오늘은 어떠셨나요?"}</span><span className="records-date">{new Date().toLocaleDateString("ko-KR",{month:"long",day:"numeric"})}</span></div>
      {caregiver ? <p className="records-writer">{targetName} 님의 기록 · 작성자 {me.name}</p> : null}
      <label htmlFor="record-body">{editing ? "기록 수정" : "오늘의 건강 상태"}</label>
      <textarea id="record-body" className="record-area" value={text} maxLength={2000} disabled={busy}
        onChange={(e) => setText(e.target.value)} placeholder={"어디가 불편했나요? 식사나 수면은 어떠셨나요?\n편하게 이야기하듯 적어 주세요."} />
      <div className="records-input-meta"><span>작은 변화도 좋은 기록이 돼요.</span><span>{text.length.toLocaleString()} / 2,000</span></div>
      <div className="records-prompts" aria-label="기록 주제">
        {["몸 상태", "식사", "수면", "복약"].map((topic) => <button key={topic} type="button" disabled={busy}
          aria-pressed={hasTopic(topic)} className={hasTopic(topic) ? "is-active" : ""}
          onClick={() => toggleTopic(topic)}>{hasTopic(topic) ? "✓" : "+"} {topic}</button>)}
      </div>
      <button className="btn-primary records-save" type="button" disabled={busy || fetching || !text.trim()} onClick={save}>
        {busy ? "처리 중…" : editing ? "수정 저장" : "기록 저장하기"}
      </button>
      {editing ? <button className="btn-out" disabled={busy} onClick={() => { setEditing(null); setText(""); }}>수정 취소</button> : null}
    </section> : null}
    {message ? <p className="msg" role="status">{message}</p> : null}
    <div className="records-list-heading"><h2>최근 건강기록</h2><span>최신순</span></div>
    {fetching && !page.items.length ? <p>불러오는 중…</p> : null}
    {!fetching && canWrite && listLoaded && !page.items.length ? <section className="records-empty"><span className="records-empty-icon" aria-hidden="true">✎</span><strong>첫 건강기록을 남겨 보세요</strong><p>오늘 남긴 기록이 다음 진료 때<br />몸 상태를 설명하는 데 도움이 돼요.</p></section> : null}
    {!fetching && canWrite && !listLoaded ? <button className="btn-out" disabled={busy} onClick={() => {
      if (!text.trim() || window.confirm("작성 중인 내용을 지우고 다시 불러올까요?")) setReload((value) => value + 1);
    }}>기록 다시 불러오기</button> : null}
    {page.items.map((r) => <article key={r.recordId} className="card records-entry">
      <p style={{ whiteSpace: "pre-wrap" }}>{r.body}</p>
      <p className="hint">{new Date(r.recordedAt).toLocaleString("ko-KR")} · {r.authorName}{r.proxyWritten ? " (보호자 작성)" : " (본인 작성)"}</p>
      {me.role === "PATIENT" || r.authorUserId === me.id ? <div className="row-actions">
        <button className="btn-out" disabled={busy || fetching} onClick={() => startEdit(r)}>수정</button>
        <button className="btn-out" disabled={busy || fetching} onClick={() => remove(r)}>삭제</button>
      </div> : null}
    </article>)}
    {page.hasNext ? <button className="btn-out" disabled={fetching || busy} onClick={loadMore}>더 불러오기</button> : null}
  </PhoneFrame>;
}
