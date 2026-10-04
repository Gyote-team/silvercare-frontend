"use client";

import { useEffect, useRef, useState } from "react";

// 알림 API가 연결되기 전에는 화면 흐름을 검증할 수 있도록 예시 항목만 보여준다.
const previewNotifications = [
  { title: "새 연결 요청", detail: "김민지 님이 보호자 연결을 요청했어요.", time: "방금" },
  { title: "복약 안내", detail: "저녁 약을 복용할 시간이에요.", time: "오후 7:00" },
  { title: "문서 정리 완료", detail: "등록한 병원 서류의 AI 정리가 끝났어요.", time: "어제" },
];

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="notification-menu" ref={rootRef}>
      <button
        className="notification-button"
        type="button"
        aria-label={`알림 ${previewNotifications.length}개`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">🔔</span>
        <i aria-label="읽지 않은 알림" />
      </button>
      {open ? (
        <section className="notification-panel" role="dialog" aria-label="알림">
          <div className="notification-title"><b>알림</b><span>새 알림 {previewNotifications.length}개</span></div>
          <div className="notification-list">
            {previewNotifications.map((notification) => (
              <article className="notification-item" key={notification.title}>
                <span className="notification-dot" aria-hidden="true" />
                <div><b>{notification.title}</b><p>{notification.detail}</p></div>
                <time>{notification.time}</time>
              </article>
            ))}
          </div>
          <p className="notification-note">현재는 화면 흐름 확인용 예시입니다. 연결 요청·복약·일정 API와 연결해 실제 알림으로 바꿉니다.</p>
        </section>
      ) : null}
    </div>
  );
}
