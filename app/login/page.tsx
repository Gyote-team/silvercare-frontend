"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WelcomeScreen } from "@/components/WelcomeScreen";

function LoginBody() {
  const params = useSearchParams();
  const error = params.get("error");
  const withdrawn = params.get("withdrawn");

  return (
    <WelcomeScreen
      extra={
        <>
          {withdrawn !== null ? <p className="msg">회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.</p> : null}
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
