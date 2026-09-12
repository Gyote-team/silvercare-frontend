"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WelcomeScreen } from "@/components/WelcomeScreen";

function LoginBody() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <WelcomeScreen
      extra={
        <>
          {error === "canceled" ? <p className="msg error">카카오 로그인을 취소했습니다.</p> : null}
          {error && error !== "canceled" ? (
            <p className="msg error">카카오 로그인에 실패했습니다. 잠시 후 다시 눌러 주세요.</p>
          ) : null}
        </>
      }
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginBody />
    </Suspense>
  );
}
