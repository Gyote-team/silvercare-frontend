"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "./PhoneFrame";
import { ScheduleForm } from "./ScheduleForm";
import { useMe } from "@/lib/useMe";
import { api, ApiRequestError } from "@/lib/api";
import { displayScheduleTime, scheduleError, scheduleQuery, scheduleStatuses, scheduleTypes, type Schedule, type ScheduleInput, type ScheduleStatus } from "@/lib/schedules";
import "@/app/action-items/action-items.css";

export function ScheduleEditorContent({ id, patientId }: { id?: string; patientId?: string }) {
  const router = useRouter();
  const [row, setRow] = useState<Schedule | null>(null); const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [blocked, setBlocked] = useState(false); const [confirm, setConfirm] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!id) return; const controller = new AbortController(); setRow(null); setError(""); setBlocked(false); setConfirm(false);
    api<Schedule>(`/api/schedules/${encodeURIComponent(id)}`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setRow(value); }).catch(caught => { if (!controller.signal.aborted) { setError(scheduleError(caught)); setBlocked(true); } });
    return () => controller.abort();
  }, [id, attempt]);
  const listHref = `/schedules${scheduleQuery(patientId)}`;
  async function save(inputs: ScheduleInput[], status: ScheduleStatus) {
    if (busy || blocked) return; setBusy(true); setError("");
    try {
      const value = await api<Schedule>(id ? `/api/schedules/${encodeURIComponent(id)}` : "/api/schedules", { method: id ? "PUT" : "POST", body: JSON.stringify({ ...inputs[0], patientId, status, ...(row ? { version: row.version } : {}) }) });
      if (!alive.current) return;
      if (id) { setRow(value); setAttempt(value => value + 1); } else router.replace(`/schedules/${encodeURIComponent(value.scheduleId)}${scheduleQuery(patientId)}`);
    } catch (caught) { if (alive.current) { setError(scheduleError(caught)); if (!(caught instanceof ApiRequestError) || caught.status !== 400) setBlocked(true); } }
    finally { if (alive.current) setBusy(false); }
  }
  async function remove() {
    if (!id || !row || busy || blocked) return; setBusy(true); setError("");
    try { await api(`/api/schedules/${encodeURIComponent(id)}?version=${row.version}`, { method: "DELETE" }); if (alive.current) router.replace(listHref); }
    catch (caught) { if (alive.current) { setError(scheduleError(caught)); setBlocked(true); } }
    finally { if (alive.current) setBusy(false); }
  }
  return <>
    {error && <div className="candidate-card" role="alert"><p>{error}</p>{blocked && (id ? <button className="candidate-button" onClick={() => setAttempt(v => v + 1)}>최신 일정 다시 불러오기</button> : <Link href={listHref} className="candidate-button">일정 목록에서 등록 결과 확인</Link>)}</div>}
    {id && !row && !error && <p role="status">일정을 불러오는 중…</p>}
    {(!id || row) && !blocked && <section className="candidate-card">
      {row?.nextOccurrenceAt && <p className="candidate-notice">다음 일정 · {displayScheduleTime(row.nextOccurrenceAt)}</p>}
      {row && row.status !== "SCHEDULED" ? <><h2>{row.title}</h2><p>{scheduleTypes[row.scheduleType]} · {scheduleStatuses[row.status]}</p><p>{displayScheduleTime(row.startsAt)}</p>{row.repeatFrequency !== "NONE" && <p>{row.repeatInterval}{row.repeatFrequency === "DAILY" ? "일" : "주"} 간격 · {row.repeatUntil}까지</p>}<p className="candidate-notice">완료·취소된 일정은 수정하거나 다시 활성화할 수 없어요.</p></> : <ScheduleForm key={`${id ?? "new"}:${row?.version ?? 0}:${attempt}`} initial={row ?? undefined} lockedType={row?.actionItemId ? row.scheduleType : undefined} editing={!!id} busy={busy} submitLabel={id ? "일정 수정 저장" : "일정 등록"} onSave={(inputs, status) => void save(inputs, status)} />}
      {row?.actionItemId && <Link className="candidate-button" href={`/action-items/${encodeURIComponent(row.actionItemId)}${scheduleQuery(patientId)}`}>승인한 원본 후보 보기 ›</Link>}
      {id && <><button className="candidate-button" disabled={busy} onClick={() => setConfirm(value => !value)}>일정 취소·삭제</button>{confirm && <div><p role="alert">이 시간대의 반복 일정 전체를 취소하고 목록에서 삭제할까요? 승인한 후보는 다시 대기로 바뀌지 않아요.</p><button className="candidate-button" disabled={busy} onClick={() => void remove()}>삭제 확정</button><button className="candidate-button" disabled={busy} onClick={() => setConfirm(false)}>삭제 취소</button></div>}</>}
    </section>}
  </>;
}
function Body({ id }: { id?: string }) {
  const { me, loading } = useMe(); const params = useSearchParams();
  const patientId = me?.role === "CAREGIVER" ? params.get("patientId") ?? undefined : undefined;
  return <PhoneFrame tab="home" userName={me?.name} scrollClassName="candidate-screen"><Link className="candidate-back" href={`/schedules${scheduleQuery(patientId)}`}>‹ 일정 목록</Link><header className="candidate-heading"><h1>{id ? "일정 상세·수정" : "새 일정 등록"}</h1><p>복약은 매일·매주 반복할 수 있어요.</p></header>
    {loading ? <p role="status">불러오는 중…</p> : me ? (!id && me.role === "CAREGIVER" && !patientId ? <p>일정 목록에서 개인을 먼저 선택해 주세요.</p> : <ScheduleEditorContent key={`${me.id}:${me.role}:${id ?? "new"}:${patientId ?? "self"}`} id={id} patientId={patientId} />) : <p role="alert">계정을 확인하지 못했어요. <Link href="/login">다시 로그인</Link></p>}
  </PhoneFrame>;
}
export function ScheduleEditor(props: { id?: string }) { return <Suspense><Body {...props} /></Suspense>; }
