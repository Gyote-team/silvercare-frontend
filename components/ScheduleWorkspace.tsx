"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "./PhoneFrame";
import { useMe } from "@/lib/useMe";
import { api, type CareRelation, type Me } from "@/lib/api";
import { displayScheduleTime, fetchSchedules, scheduleError, scheduleQuery, scheduleStatuses, scheduleTypes, type SchedulePage } from "@/lib/schedules";
import "@/app/action-items/action-items.css";

export function ScheduleList({ patientId }: { patientId?: string }) {
  const [result, setResult] = useState<SchedulePage | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError(""); setResult(null);
    fetchSchedules(patientId, page, controller.signal).then(value => { if (!controller.signal.aborted) setResult(value); })
      .catch(caught => { if (!controller.signal.aborted) setError(scheduleError(caught)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [patientId, page, attempt]);
  return <>
    <Link className="candidate-button schedule-primary" href={`/schedules/new${scheduleQuery(patientId)}`}>+ 새 일정 등록</Link>
    {busy && <p role="status">일정을 불러오는 중…</p>}
    {error && <div className="candidate-card" role="alert"><p>{error}</p><button className="candidate-button" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></div>}
    {result && !result.items.length && <div className="candidate-card"><h2>등록된 일정이 없어요</h2><p>할 일 후보를 승인하거나 직접 일정을 등록해 보세요.</p></div>}
    <ul className="candidate-list">{result?.items.map(item => <li key={item.scheduleId}><Link className={`candidate-card candidate-link${item.status === "CANCELLED" ? " is-canceled" : ""}`} href={`/schedules/${encodeURIComponent(item.scheduleId)}${scheduleQuery(patientId)}`}>
      <div className="candidate-tags"><span className={`candidate-status ${item.status === "COMPLETED" ? "approved" : item.status === "CANCELLED" ? "canceled" : "pending"}`}>{scheduleStatuses[item.status]}</span><span>{scheduleTypes[item.scheduleType]}</span></div>
      <h2>{item.title}<span aria-hidden="true">›</span></h2><p>{displayScheduleTime(item.startsAt)}</p>
      {item.repeatFrequency !== "NONE" && <p className="candidate-meta">{item.repeatInterval}{item.repeatFrequency === "DAILY" ? "일" : "주"} 간격 · {item.repeatUntil}까지<br />{item.nextOccurrenceAt ? `다음 일정 · ${displayScheduleTime(item.nextOccurrenceAt)}` : "예정된 반복 일정 없음"}</p>}
      <p className="candidate-source-name">{item.actionItemId ? "후보를 승인해 등록한 일정" : "직접 등록한 일정"}</p>
    </Link></li>)}</ul>
    {result && <div className="schedule-toolbar"><button className="candidate-button" disabled={page === 0 || busy} onClick={() => setPage(value => value - 1)}>이전</button><span>{page + 1}페이지 · 전체 {result.totalCount}건</span><button className="candidate-button" disabled={(page + 1) * result.size >= result.totalCount || busy} onClick={() => setPage(value => value + 1)}>다음</button></div>}
  </>;
}
function Scope({ me }: { me: Me }) {
  const params = useSearchParams(); const router = useRouter();
  const [targets, setTargets] = useState<CareRelation[] | null>(null); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  const care = me.role === "CAREGIVER";
  const target = care ? params.get("patientId") ?? (targets?.length === 1 ? targets[0].patientId : "") : undefined;
  useEffect(() => {
    if (!care) return; const controller = new AbortController(); setTargets(null); setError("");
    api<CareRelation[]>("/api/care-relations", { signal: controller.signal }).then(rows => { if (!controller.signal.aborted) setTargets(rows.filter(row => row.status === "ACTIVE")); })
      .catch(caught => { if (!controller.signal.aborted) setError(scheduleError(caught)); });
    return () => controller.abort();
  }, [care, attempt]);
  const allowed = me.role === "PATIENT" || (care && targets?.some(row => row.patientId === target));
  return <>{care && <section className="candidate-card"><label htmlFor="schedule-patient">일정을 확인할 개인</label>
    {targets && <select id="schedule-patient" value={target} onChange={e => router.replace(`/schedules${scheduleQuery(e.target.value)}`)}><option value="">개인을 선택해 주세요</option>{targets.map(row => <option key={row.id} value={row.patientId}>{row.counterpartName}</option>)}</select>}
    {!targets && !error && <p role="status">연결 확인 중…</p>}{error && <div role="alert"><p>{error}</p><button className="candidate-button" onClick={() => setAttempt(v => v + 1)}>연결 다시 확인</button></div>}
    {targets?.length === 0 && <p>연결된 개인이 없어요. <Link href="/account">개인 연결 관리</Link></p>}{!!targets?.length && !allowed && <p>현재 연결된 개인을 선택해 주세요.</p>}
  </section>}{allowed && <ScheduleList key={`${me.id}:${me.role}:${target ?? "self"}`} patientId={target || undefined} />}</>;
}
function Body() {
  const { me, loading } = useMe();
  return <PhoneFrame tab="home" userName={me?.name} scrollClassName="candidate-screen"><Link className="candidate-back" href="/home">‹ 홈으로</Link><header className="candidate-heading"><span>확인하고 등록한 나의 계획</span><h1>일정 관리</h1><p>후보에서 승인한 일정과 직접 등록한 일정을 함께 관리해요.<br />복약 반복은 시간대별로 확인할 수 있어요.</p></header><Link className="candidate-button" href="/action-items">할 일 후보 확인 ›</Link>
    {loading ? <p role="status">불러오는 중…</p> : me ? <Scope key={`${me.id}:${me.role}`} me={me} /> : <p role="alert">계정을 확인하지 못했어요. <Link href="/login">다시 로그인</Link></p>}
  </PhoneFrame>;
}
export function ScheduleWorkspace() { return <Suspense><Body /></Suspense>; }
