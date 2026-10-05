"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountRole, ApiRequestError, fetchLinkedAccounts, LinkedAccounts, logout, switchAccount } from "@/lib/api";

const ACCOUNT_LABEL: Record<AccountRole, string> = {
  PATIENT: "개인 계정",
  CAREGIVER: "보호자 계정"
};

export function AccountMenu({ userName }: { userName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [linked, setLinked] = useState<LinkedAccounts | null>(null);
  const [switching, setSwitching] = useState(false);
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

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    fetchLinkedAccounts()
      .then((result) => {
        if (!cancelled) {
          setLinked(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLinked(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const switchTarget: AccountRole | null =
    linked?.currentRole === "PATIENT" ? "CAREGIVER" : linked?.currentRole === "CAREGIVER" ? "PATIENT" : null;

  async function onSwitch() {
    if (!switchTarget || !linked) {
      return;
    }
    const label = ACCOUNT_LABEL[switchTarget];
    const exists = linked.accounts.some((account) => account.role === switchTarget);
    if (!exists) {
      const ok = window.confirm(`아직 ${label}이 없어요. ${label}을 새로 만들고 전환할까요?`);
      if (!ok) {
        return;
      }
    }
    setSwitching(true);
    try {
      await switchAccount(switchTarget);
      window.location.href = "/home";
    } catch (error) {
      setSwitching(false);
      if (error instanceof ApiRequestError && error.status === 401) {
        router.replace("/login");
        return;
      }
      window.alert(`${label}으로 전환하지 못했어요. 잠시 후 다시 시도해 주세요.`);
    }
  }

  async function onLogout() {
    setOpen(false);
    const ok = window.confirm("로그아웃하면 이 기기에서 로그인이 풀립니다. 로그아웃할까요?");
    if (!ok) {
      return;
    }
    await logout();
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
          {switchTarget ? (
            <button
              className="account-item"
              type="button"
              role="menuitem"
              disabled={switching}
              onClick={onSwitch}
            >
              {switching ? "전환 중..." : `${ACCOUNT_LABEL[switchTarget]}으로 전환`}
            </button>
          ) : null}
          <button className="account-item" type="button" role="menuitem" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
}
