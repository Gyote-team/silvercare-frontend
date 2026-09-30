"use client";

import Link from "next/link";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useMe } from "@/lib/useMe";

const ROLE_LABEL: Record<string, string> = {
  PATIENT: "개인",
  CAREGIVER: "보호자",
  ADMIN: "관리자"
};

export default function AccountPage() {
  const { me, loading } = useMe();

  if (loading || !me) {
    return (
      <PhoneFrame tab="home">
        <p className="page-sub">불러오는 중…</p>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame tab="home" chatLocked={me.role === "CAREGIVER"} userName={me.name}>
      <div className="page-title">내 계정</div>
      <p className="page-sub">로그인한 계정 정보입니다.</p>

      <section className="card account-card">
        <div className="account-profile">
          <span className="account-avatar large" aria-hidden="true">{me.name.slice(0, 1)}</span>
          <div>
            <strong>{me.name}</strong>
            <span>{ROLE_LABEL[me.role] ?? me.role} 계정</span>
          </div>
        </div>
        {me.role === "PATIENT" && me.inviteCode ? (
          <dl className="account-info">
            <div>
              <dt>초대 코드</dt>
              <dd>{me.inviteCode}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <Link className="account-withdraw-link" href="/withdraw">
        회원 탈퇴
      </Link>
    </PhoneFrame>
  );
}
