"use client";
import { useState, type FormEvent } from "react";
import { localDateTime, scheduleTypes, scheduleStatuses, type ScheduleInput, type ScheduleType, type ScheduleStatus } from "@/lib/schedules";

export function ScheduleForm({ initial, lockedType, allowMultiple = false, editing = false, busy = false, submitLabel, onSave, onCancel }: {
  initial?: Partial<ScheduleInput> & { status?: ScheduleStatus }; lockedType?: ScheduleType; allowMultiple?: boolean;
  editing?: boolean; busy?: boolean; submitLabel: string; onSave: (inputs: ScheduleInput[], status: ScheduleStatus) => void; onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<ScheduleType>(lockedType ?? initial?.scheduleType ?? "PERSONAL");
  const [start, setStart] = useState(initial?.startsAt ? localDateTime(initial.startsAt) : "");
  const [end, setEnd] = useState(initial?.endsAt ? localDateTime(initial.endsAt) : "");
  const [repeat, setRepeat] = useState<ScheduleInput["repeatFrequency"]>(initial?.repeatFrequency ?? "NONE");
  const [interval, setInterval] = useState(initial?.repeatInterval ?? 1);
  const [until, setUntil] = useState(initial?.repeatUntil ?? "");
  const [status, setStatus] = useState<ScheduleStatus>(initial?.status ?? "SCHEDULED");
  const [extra, setExtra] = useState<string[]>([]);
  const [error, setError] = useState("");
  function save(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError("");
    const begins = new Date(`${start}+09:00`).getTime();
    const finishes = end ? new Date(`${end}+09:00`).getTime() : null;
    if (!title.trim() || !Number.isFinite(begins) || (finishes !== null && (!Number.isFinite(finishes) || finishes <= begins))) { setError("제목과 시작·종료 일시를 확인해 주세요."); return; }
    if (repeat !== "NONE" && (!until || until < start.slice(0, 10))) { setError("반복 종료일은 시작일 이후로 선택해 주세요."); return; }
    const starts = [begins, ...extra.map(time => time ? new Date(`${start.slice(0, 10)}T${time}+09:00`).getTime() : NaN)];
    if (starts.some(time => !Number.isFinite(time)) || new Set(starts).size !== starts.length) { setError("복약 시간을 빠짐없이, 서로 다르게 선택해 주세요."); return; }
    onSave(starts.map(time => ({ title: title.trim(), scheduleType: type, startsAt: new Date(time).toISOString(), endsAt: finishes === null ? null : new Date(time + finishes - begins).toISOString(), repeatFrequency: repeat, repeatInterval: repeat === "NONE" ? 1 : interval, repeatUntil: repeat === "NONE" ? null : until })), status);
  }
  return <form className="schedule-form" onSubmit={save}><fieldset disabled={busy}>
    <label>일정 제목<input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required /></label>
    {!lockedType && <label>일정 종류<select value={type} onChange={e => { setType(e.target.value as ScheduleType); setRepeat("NONE"); setExtra([]); }}>{Object.entries(scheduleTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
    <p className="candidate-meta">모든 일시는 한국 시간 기준이에요.</p>
    <label>시작 일시<input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} min="2000-01-01T00:00" max="2100-12-31T23:59" required /></label>
    <label>종료 일시 (선택)<input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></label>
    {type === "MEDICATION" && <>
      <label>반복<select value={repeat} onChange={e => setRepeat(e.target.value as ScheduleInput["repeatFrequency"])}><option value="NONE">반복 안 함</option><option value="DAILY">매일</option><option value="WEEKLY">매주</option></select></label>
      {repeat !== "NONE" && <><label>반복 간격 ({repeat === "DAILY" ? "일" : "주"})<input type="number" min={1} max={30} value={interval} onChange={e => setInterval(Number(e.target.value))} required /></label><label>반복 종료일<input type="date" value={until} onChange={e => setUntil(e.target.value)} min={start.slice(0, 10)} required /></label><p className="candidate-meta">시작일부터 최대 1년까지, 종료일을 포함해 반복해요.</p></>}
      {allowMultiple && <>{extra.map((time, index) => <div className="schedule-extra" key={index}><label>추가 복약 시간 {index + 1}<input type="time" value={time} onChange={e => setExtra(values => values.map((value, i) => i === index ? e.target.value : value))} required /></label><button type="button" aria-label={`추가 복약 시간 ${index + 1} 제거`} onClick={() => setExtra(values => values.filter((_, i) => i !== index))}>제거</button></div>)}{extra.length < 7 && <button className="candidate-button" type="button" onClick={() => setExtra(values => [...values, ""])}>+ 복약 시간 추가</button>}<p className="candidate-meta">추가 시간은 같은 시작일과 반복 규칙을 사용해요. 시간대별 일정으로 함께 등록돼요.</p></>}
    </>}
    {editing && <label>일정 상태<select value={status} onChange={e => setStatus(e.target.value as ScheduleStatus)}>{Object.entries(scheduleStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
    {editing && repeat !== "NONE" && <p className="candidate-notice">수정·완료·취소·삭제는 이 시간대의 반복 일정 전체에 적용돼요.</p>}
    {error && <p role="alert">{error}</p>}
    <button className="candidate-button schedule-primary" type="submit">{busy ? "처리 중…" : submitLabel}</button>
    {onCancel && <button className="candidate-button" type="button" onClick={onCancel}>수정 취소</button>}
  </fieldset></form>;
}
