"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { PhoneFrame } from "@/components/PhoneFrame";
import { rememberAccount } from "@/lib/accountHint";
import { api } from "@/lib/api";

export default function RolePage() {
  const router = useRouter();
  const [role, setRole] = useState<"PATIENT" | "CAREGIVER" | "">("");
  const [error, setError] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!role) {
      return;
    }
    const label = role === "PATIENT" ? "내 건강관리" : "가족 돌봄";
    const ok = window.confirm(`${label}부터 시작할까요?\n나중에 내 계정에서 다른 기능도 추가할 수 있습니다.`);
    if (!ok) {
      return;
    }
    try {
      await api("/api/role", {
        method: "POST",
        body: JSON.stringify({ role })
      });
      rememberAccount();
      router.replace("/home");
    } catch {
      setError(true);
    }
  }

  return (
    <PhoneFrame scrollClassName="login-screen">
      <header className="login-hero login-hero-short">
        <BrandLogo compact />
        <h1 className="page-title">어떻게 쓰시나요?</h1>
        <p className="page-sub">먼저 시작할 기능을 골라 주세요. 다른 기능은 나중에 내 계정에서 추가할 수 있어요.</p>
      </header>
      <form className="role-form" onSubmit={onSubmit}>
        {error ? <p className="msg error">역할을 고를 수 없습니다. 다시 눌러 주세요.</p> : null}
        <label className="role-card">
          <input type="radio" name="role" value="PATIENT" required onChange={() => setRole("PATIENT")} />
          <span className="role-card-body">
            <strong>내 건강관리부터 시작</strong>
            <span>내 진료와 건강기록을 남깁니다. 보호자에게 초대 코드를 보여 줍니다.</span>
          </span>
        </label>
        <label className="role-card">
          <input type="radio" name="role" value="CAREGIVER" required onChange={() => setRole("CAREGIVER")} />
          <span className="role-card-body">
            <strong>가족 돌봄부터 시작</strong>
            <span>가족이 보여 준 코드로 연결을 요청합니다. 동의한 기록만 볼 수 있습니다.</span>
          </span>
        </label>
        <p className="role-warn">시작 방식은 연결 권한을 제한하지 않습니다. 내 계정에서 건강 프로필과 돌봄 연결을 함께 관리할 수 있습니다.</p>
        <button className="btn-primary" type="submit">
          시작하기
        </button>
      </form>
    </PhoneFrame>
  );
}
