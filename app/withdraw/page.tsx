"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ApiRequestError, withdrawAccount } from "@/lib/api";
import { useMe } from "@/lib/useMe";

export default function WithdrawPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading || !me) {
    return (
      <PhoneFrame tab="home">
        <p className="page-sub">불러오는 중…</p>
      </PhoneFrame>
    );
  }

  const counterpart = me.role === "PATIENT" ? "보호자와" : "가족(개인)과";

  async function withdraw() {
    const ok = window.confirm("정말 탈퇴할까요?\n탈퇴한 카카오 계정으로는 다시 로그인할 수 없습니다.");
    if (!ok) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await withdrawAccount();
      router.replace(`/login?withdrawn=${result.revokedRelationCount}`);
    } catch (caught) {
      setBusy(false);
      if (caught instanceof ApiRequestError && caught.status === 401) {
        router.replace("/login");
        return;
      }
      setError(caught instanceof ApiRequestError ? caught.error : "탈퇴를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <PhoneFrame tab="home" chatLocked={me.role === "CAREGIVER"}>
      <div className="page-title">회원 탈퇴</div>
      <p className="page-sub">{me.name} 님, 탈퇴하기 전에 아래 내용을 확인해 주세요.</p>

      <section className="card withdraw-notice">
        <p className="card-label">탈퇴하면</p>
        <ul>
          <li>연결된 {counterpart}의 연결이 모두 해제되고, 대기 중인 연결 요청은 취소됩니다.</li>
          <li>이 카카오 계정으로는 다시 로그인하거나 가입할 수 없습니다.</li>
          <li>탈퇴는 되돌릴 수 없습니다.</li>
        </ul>
      </section>

      <label className="withdraw-agree">
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
        <span>위 내용을 확인했고, 탈퇴에 동의합니다.</span>
      </label>

      {error ? <p className="msg error">{error}</p> : null}

      <button className="btn-primary btn-withdraw" type="button" disabled={!agreed || busy} onClick={withdraw}>
        {busy ? "탈퇴 처리 중…" : "탈퇴하기"}
      </button>
      <Link className="btn-out withdraw-back" href="/home">
        돌아가기
      </Link>
    </PhoneFrame>
  );
}
