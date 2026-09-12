"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthActions, AuthFooter } from "@/components/AuthActions";
import { BrandLogo } from "@/components/BrandLogo";
import { PhoneFrame } from "@/components/PhoneFrame";
import { rememberAccount } from "@/lib/accountHint";
import { api, type AuthConfig } from "@/lib/api";

type WelcomeScreenProps = {
  extra?: ReactNode;
};

export function WelcomeScreen({ extra }: WelcomeScreenProps) {
  const router = useRouter();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<AuthConfig>("/api/auth/config")
      .then((value) => {
        setConfig(value);
        setOffline(false);
      })
      .catch(() => {
        setConfig(null);
        setOffline(true);
      });
  }, []);

  async function demoLogin(event: FormEvent) {
    event.preventDefault();
    const me = await api<{ role: string }>("/api/demo/login", {
      method: "POST",
      body: JSON.stringify({ role: "CAREGIVER" })
    });
    rememberAccount();
    router.replace(me.role === "PENDING" ? "/role" : "/home");
  }

  return (
    <PhoneFrame scrollClassName="login-screen">
      <div className="login-layout">
        <header className="welcome-copy">
          <BrandLogo photo />
        </header>
        <div className="login-main">
          <h1 className="welcome-title">간편 로그인</h1>
          <p className="welcome-sub">
            진료 동행과 건강기록을 잇는 서비스입니다.
            <br />
            자주 쓰는 계정으로 간편하게 시작할 수 있습니다.
          </p>
          <AuthActions
            config={config}
            offline={offline}
            busy={busy}
            onBusy={() => setBusy(true)}
            extra={extra}
          />
        </div>
        <AuthFooter
          legalPrefix="로그인하면"
          demoLogin={config?.demoLogin}
          onDemo={demoLogin}
        />
      </div>
    </PhoneFrame>
  );
}
