"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { VisitForm } from "@/components/VisitForm";
import { useMe } from "@/lib/useMe";
import { api, ApiRequestError, type HealthRecord } from "@/lib/api";
import { type Visit, type VisitInput, getVisit, cancelVisit, writeVisit, visitDateLabel, visitError, visitStatusLabel } from "@/lib/visits";
import "../visits.css";

export default function VisitDetailPage() {
  const params = useParams<{ visitId: string }>();
  const id = params.visitId;
  const { me, loading } = useMe();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [recordCount, setRecordCount] = useState(0);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [recordError, setRecordError] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordReload, setRecordReload] = useState(0);
  const caregiver = me?.role === "CAREGIVER";

  useEffect(() => {
    if (!me) return;
    const controller = new AbortController();
    setFetching(true); setVisit(null); setEditing(false); setDirty(false); setError(""); setStale(false);
    setRecordCount(0); setRecords([]); setRecordError("");
    getVisit(id, controller.signal).then(result => { if (!controller.signal.aborted) setVisit(result); })
      .catch(reason => { if (!controller.signal.aborted) setError(visitError(reason)); })
      .finally(() => { if (!controller.signal.aborted) setFetching(false); });
    return () => controller.abort();
  }, [me, id, reload]);

  useEffect(() => {
    if (!visit || recordCount === 0) return;
    const controller = new AbortController();
    setRecordLoading(true); setRecordError("");
    Promise.all(visit.healthRecordIds.slice(0, recordCount).map(recordId => api<HealthRecord>(`/api/health-records/${encodeURIComponent(recordId)}`, { signal: controller.signal })))
      .then(result => { if (!controller.signal.aborted) setRecords(result); })
      .catch(reason => { if (!controller.signal.aborted) { setRecords([]); setRecordError(visitError(reason)); } })
      .finally(() => { if (!controller.signal.aborted) setRecordLoading(false); });
    return () => controller.abort();
  }, [visit, recordCount, recordReload]);

  function failed(reason: unknown) {
    setError(visitError(reason));
    if (reason instanceof ApiRequestError && [403, 404].includes(reason.status)) { setVisit(null); setRecords([]); setEditing(false); }
    if (reason instanceof ApiRequestError && reason.status === 409) setStale(true);
  }
  async function save(input: VisitInput) {
    if (busy || stale || !visit) return;
    setBusy(true); setError(""); setMessage("");
    try { setVisit(await writeVisit(input, id)); setEditing(false); setDirty(false); setMessage("방문 정보를 수정했어요."); }
    catch (reason) { failed(reason); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (busy || stale || !visit || visit.visitStatus === "CANCELED") return;
    if (!window.confirm("이 방문을 취소할까요? 연결된 건강기록과 서류는 유지돼요. 취소한 방문은 수정할 수 없어요.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await cancelVisit(id);
      setVisit(current => current ? { ...current, visitStatus: "CANCELED" } : null);
      setEditing(false); setDirty(false); setMessage("방문을 취소했어요. 연결된 자료는 그대로 유지돼요.");
      setVisit(await getVisit(id));
    } catch (reason) { failed(reason); }
    finally { setBusy(false); }
  }
  function retry() {
    if (dirty && !window.confirm("작성 중인 수정 내용을 지우고 최신 정보를 다시 불러올까요?")) return;
    setReload(value => value + 1);
  }
  if (loading || !me) return <PhoneFrame tab="timeline"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  return <PhoneFrame tab="timeline" userName={me.name} chatLocked={caregiver} scrollClassName="visits-screen">
    <Link className="visit-back" href="/timeline" onClick={event => {
      if (dirty && !window.confirm("수정 중인 내용이 있어요. 저장하지 않고 목록으로 돌아갈까요?")) event.preventDefault();
    }}>‹ 방문 목록</Link>
    <header className="visits-heading"><h1>방문 상세</h1><p>{caregiver ? "연결된 개인의 방문을 함께 관리해요." : "내 방문 정보와 연결된 자료를 확인해요."}</p></header>
    {fetching && <p role="status">방문 정보를 불러오는 중…</p>}
    {error && <div className="visit-error" role="alert"><p>{error}</p><button className="btn-out" disabled={busy || fetching} onClick={retry}>방문 다시 불러오기</button></div>}
    {message && <p className="visit-success" role="status">{message}</p>}
    {visit && <>
      {editing ? <VisitForm key={visit.updatedAt} initial={visit} patientId={caregiver ? visit.patientId : undefined} disabled={busy || stale} pending={busy} onSave={save} onDirty={setDirty} onCancel={() => {
        if (!dirty || window.confirm("수정 중인 내용을 지울까요?")) { setEditing(false); setDirty(false); }
      }} /> : <section className="visit-detail card">
        <span className={`visit-status ${visit.visitStatus.toLowerCase()}`}>{visitStatusLabel[visit.visitStatus]}</span>
        <h2>{visit.hospitalName || "병원명 미입력"}</h2><p className="visit-date">{visitDateLabel(visit.visitedOn)}</p>
        <dl><div><dt>진료과</dt><dd>{visit.department || "미입력"}</dd></div><div><dt>방문 메모</dt><dd className="visit-memo">{visit.memo || "남긴 메모가 없어요."}</dd></div></dl>
        {visit.visitStatus === "CANCELED" ? <p className="visit-canceled-note">취소된 방문이에요. 정보는 수정할 수 없지만 연결된 자료는 계속 확인할 수 있어요.</p> : <div className="visit-detail-actions">
          <button className="btn-out" disabled={busy || stale} onClick={() => setEditing(true)}>방문 수정</button>
          <button className="btn-out visit-cancel" disabled={busy || stale} onClick={cancel}>{busy ? "처리 중…" : "방문 취소"}</button>
        </div>}
      </section>}
      <section className="visit-linked card"><h2>연결된 자료</h2>
        <p>건강기록 {visit.healthRecordIds.length}건 · 병원 서류 {visit.documentIds.length}건</p>
        {!visit.healthRecordIds.length && <p className="visit-hint">이 방문에 연결된 건강기록이 없어요.</p>}
        {records.length < visit.healthRecordIds.length && <button className="btn-out" disabled={recordLoading} onClick={() => {
          setRecordCount(count => Math.min(visit.healthRecordIds.length, count + 10)); setRecordReload(value => value + 1);
        }}>
          {recordLoading ? "기록을 불러오는 중…" : records.length ? "연결 기록 더 보기" : "연결 건강기록 보기"}
        </button>}
        {recordError && <p role="alert">{recordError}</p>}
        {records.map(record => <article className="visit-linked-record" key={record.recordId}><p>{record.body}</p><span>{record.authorName} · {record.proxyWritten ? "보호자 작성" : "본인 작성"}</span></article>)}
        {!visit.documentIds.length && <p className="visit-hint">이 방문에 연결된 병원 서류가 없어요.</p>}
        <div className="visit-document-links">{visit.documentIds.map((docId, index) => <Link key={docId} href={`/documents/${docId}?visitId=${encodeURIComponent(visit.visitId)}${caregiver ? `&patientId=${encodeURIComponent(visit.patientId)}` : ""}`}>병원 서류 {index + 1} 보기 ›</Link>)}</div>
      </section>
    </>}
  </PhoneFrame>;
}
