"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

export function AccountMenu({ userName }: { userName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function logout() {
    setOpen(false);
    const ok = window.confirm("로그아웃하면 이 기기에서 로그인이 풀립니다. 로그아웃할까요?");
    if (!ok) {
      return;
    }
    await fetch(`${API_BASE}/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    router.replace("/login");
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        className="account-avatar"
        type="button"
        aria-label="계정 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {userName.slice(0, 1)}
      </button>
      {open ? (
        <div className="account-dropdown" role="menu">
          <Link className="account-item" href="/account" role="menuitem" onClick={() => setOpen(false)}>
            내 계정
          </Link>
          <button className="account-item" type="button" role="menuitem" onClick={logout}>
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
}
