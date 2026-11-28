"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { actionError, type ActionItem } from "@/lib/actionItems";
import { scheduleError, scheduleQuery, type ScheduleInput, type ScheduleType } from "@/lib/schedules";
import { ScheduleForm } from "./ScheduleForm";

export function CandidateActions({ item, onReload }: { item: ActionItem; onReload: () => void }) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const type: ScheduleType = item.type === "CAUTION" ? "OTHER" : item.type;
  async function act(action: "approve" | "reject", inputs?: ScheduleInput[]) {
    if (busy || blocked) return;
    setBusy(true); setError("");
    try {
      await api(`/api/action-items/${encodeURIComponent(item.actionItemId)}/${action}`, { method: "POST", ...(inputs ? { body: JSON.stringify({ schedules: inputs }) } : {}) });
      if (alive.current) onReload();
    } catch (caught) {
      if (!alive.current) return;
      setError(caught instanceof ApiRequestError && caught.status === 400 ? scheduleError(caught) : actionError(caught, "처리"));
      if (!(caught instanceof ApiRequestError) || caught.status !== 400) setBlocked(true);
    } finally { if (alive.current) setBusy(false); }
  }
  if (item.approvalStatus !== "PENDING") return item.approvalStatus === "APPROVED" ? <Link className="candidate-button" href={`/schedules${scheduleQuery(item.patientId)}`}>확정 일정 확인 ›</Link> : null;
  if (item.sourceDocumentDeleted) return null;
  return <section className="candidate-card"><h2>후보 확인</h2><p>원본 안내를 확인한 뒤 일정을 지정해 승인하거나, 필요 없는 후보를 거절해 주세요.</p>
    {error && <p role="alert">{error}</p>}
    {blocked ? <button className="candidate-button" onClick={onReload}>후보 상태 다시 확인</button> : <>
      {!open && !rejecting && <><button className="candidate-button schedule-primary" onClick={() => setOpen(true)}>일정 확인하고 승인</button><button className="candidate-button" onClick={() => setRejecting(true)}>이 후보 거절</button></>}
      {open && <ScheduleForm initial={{ title: item.title, startsAt: item.estimatedAt ?? undefined }} lockedType={type} allowMultiple={type === "MEDICATION"} busy={busy} submitLabel="승인하고 일정 등록" onSave={inputs => void act("approve", inputs)} onCancel={() => setOpen(false)} />}
      {rejecting && <><p>거절한 후보는 다시 승인할 수 없어요. 거절할까요?</p><button className="candidate-button" disabled={busy} onClick={() => void act("reject")}>거절 확정</button><button className="candidate-button" disabled={busy} onClick={() => setRejecting(false)}>돌아가기</button></>}
    </>}
  </section>;
}
