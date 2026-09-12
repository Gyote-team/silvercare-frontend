"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";
import { SocialButtons } from "@/components/SocialButtons";
import type { AuthConfig } from "@/lib/api";

type AuthActionsProps = {
  config: AuthConfig | null;
  offline: boolean;
  busy: boolean;
  onBusy: () => void;
  extra?: ReactNode;
};

export function AuthActions({
  config,
  offline,
  busy,
  onBusy,
  extra
}: AuthActionsProps) {
  const [soon, setSoon] = useState("");

  return (
    <section className="auth-actions">
      {extra}
      {offline ? (
        <p className="warn">
          서버에 연결하지 못했습니다. backend 폴더에서 run.ps1을 다시 실행한 뒤 이 화면을 새로고침해 주세요.
        </p>
      ) : null}
      {!offline && config && !config.kakaoReady ? (
        <p className="warn">
          카카오 앱 키가 없습니다. backend/README.md를 보고 KAKAO_CLIENT_ID를 넣은 뒤 다시 실행하세요.
        </p>
      ) : null}
      {soon ? <p className="msg">{soon}</p> : null}
      <SocialButtons
        kakaoReady={Boolean(config?.kakaoReady)}
        busy={busy}
        onBusy={onBusy}
        onSoon={(name) =>
          setSoon(`${name} 로그인은 아직 연결 전입니다. 지금은 카카오로만 들어올 수 있어요.`)
        }
      />
    </section>
  );
}

export function AuthFooter({
  legalPrefix,
  demoLogin,
  onDemo
}: {
  legalPrefix: string;
  demoLogin?: boolean;
  onDemo?: (event: FormEvent) => void;
}) {
  return (
    <footer className="login-footer">
      <p className="legal">
        {legalPrefix}{" "}
        <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보 처리방침</Link>에 동의하게 됩니다.
      </p>
      {demoLogin && onDemo ? (
        <form className="demo-link" onSubmit={onDemo}>
          <button type="submit">시연용 · 보호자(김민지)로 보기</button>
        </form>
      ) : null}
    </footer>
  );
}
