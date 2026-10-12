"use client";

import { ReactNode, useEffect, useState } from "react";
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
  const [demoError, setDemoError] = useState("");

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

  async function demoLogin(account: string) {
    if (busy) return;
    setBusy(true);
    setDemoError("");
    try {
      const me = await api<{ role: string }>("/api/demo/login", {
        method: "POST",
        body: JSON.stringify({ account })
      });
      rememberAccount();
      router.replace(me.role === "PENDING" ? "/role" : "/home");
    } catch {
      setDemoError("시연용 로그인에 실패했습니다.");
      setBusy(false);
    }
  }

  return (
    <PhoneFrame scrollClassName="login-screen" showTopbar={false}>
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
            extra={
              <>
                {extra}
                {demoError ? <p className="msg error">{demoError}</p> : null}
              </>
            }
          />
        </div>
        <AuthFooter
          legalPrefix="로그인하면"
          demoLogin={config?.demoLogin}
          onDemo={demoLogin}
          demoBusy={busy}
        />
      </div>
    </PhoneFrame>
  );
}
