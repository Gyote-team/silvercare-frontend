"use client";

import { useEffect, useId, useRef, useState } from "react";

export function RecordActions({ disabled, onEdit, onDelete }: {
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div className="record-actions" ref={root} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} className="record-actions-trigger" type="button"
      aria-label="건강기록 관리" aria-expanded={open && !disabled} aria-controls={menuId}
      disabled={disabled} onClick={() => setOpen(value => !value)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
      </svg>
    </button>
    {open && !disabled && <div className="record-actions-dropdown" id={menuId}>
      <button type="button" onClick={() => { setOpen(false); onEdit(); }}>수정</button>
      <button type="button" className="record-actions-delete" onClick={() => { setOpen(false); onDelete(); }}>삭제</button>
    </div>}
  </div>;
}
