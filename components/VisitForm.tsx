"use client";
import { useState, type FormEvent } from "react";
import { type Visit, type VisitInput, type VisitStatus, todayInSeoul } from "@/lib/visits";

export function VisitForm({ initial, patientId, disabled, pending = false, onSave, onDirty, onCancel }: {
  initial?: Visit; patientId?: string; disabled: boolean; pending?: boolean;
  onSave: (input: VisitInput) => Promise<void>; onDirty?: (dirty: boolean) => void; onCancel?: () => void;
}) {
  const [date, setDate] = useState(initial?.visitedOn ?? todayInSeoul());
  const [hospital, setHospital] = useState(initial?.hospitalName ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [status, setStatus] = useState<VisitStatus>(initial?.visitStatus ?? "DONE");
  const future = date > todayInSeoul();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !date) return;
    await onSave({ patientId, version: initial?.version, visitedOn: date, hospitalName: hospital.trim() || null,
      department: department.trim() || null, memo: memo.trim() || null, visitStatus: future ? "SCHEDULED" : status });
  }
  return <form className="visit-form" onSubmit={submit} onChange={() => onDirty?.(true)}>
    <div className="visit-form-heading"><h2>{initial ? "방문 정보 수정" : "새 방문 등록"}</h2><span>날짜와 상태는 필수예요</span></div>
    <fieldset disabled={disabled}>
      <label htmlFor="visit-date">방문 날짜</label>
      <input id="visit-date" type="date" required value={date} onChange={event => {
        setDate(event.target.value); if (event.target.value > todayInSeoul()) setStatus("SCHEDULED");
      }} />
      <label htmlFor="visit-hospital">병원명 <span>선택</span></label>
      <input id="visit-hospital" value={hospital} maxLength={200} onChange={event => setHospital(event.target.value)} placeholder="예: 서울병원" />
      <label htmlFor="visit-department">진료과 <span>선택</span></label>
      <input id="visit-department" value={department} maxLength={100} onChange={event => setDepartment(event.target.value)} placeholder="예: 내과, 정형외과" />
      <label htmlFor="visit-status">방문 상태</label>
      <select id="visit-status" value={future ? "SCHEDULED" : status} onChange={event => setStatus(event.target.value as VisitStatus)}>
        <option value="SCHEDULED">방문 예정</option><option value="DONE" disabled={future}>방문 완료</option>
      </select>
      {future && <p className="visit-hint">미래 날짜는 방문 예정으로 등록돼요.</p>}
      <label htmlFor="visit-memo">방문 메모 <span>선택</span></label>
      <textarea id="visit-memo" rows={3} value={memo} maxLength={2000} onChange={event => setMemo(event.target.value)} placeholder="진료 때 확인할 내용이나 방문 내용을 남겨 주세요." />
      <p className="visit-character-count">{memo.length.toLocaleString()} / 2,000</p>
      <button className="btn-primary visit-submit" type="submit" disabled={disabled || !date}>{pending ? "처리 중…" : initial ? "수정 저장" : "방문 등록하기"}</button>
      {onCancel && <button className="btn-out" type="button" onClick={onCancel}>수정 취소</button>}
    </fieldset>
  </form>;
}
