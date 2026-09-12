"use client";

import { KakaoButton } from "@/components/KakaoButton";

type SocialButtonsProps = {
  kakaoReady?: boolean;
  busy?: boolean;
  onBusy?: () => void;
  onSoon?: (name: string) => void;
};

export function SocialButtons({
  kakaoReady = false,
  busy = false,
  onBusy,
  onSoon
}: SocialButtonsProps) {
  return (
    <div className="social-stack">
      {kakaoReady ? <KakaoButton label="카카오로 로그인" busy={busy} onBusy={onBusy} /> : null}
      <button type="button" className="btn btn-naver" onClick={() => onSoon?.("네이버")}>
        <svg className="social-symbol" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#fff"
            d="M13.5 12.4 8.2 4H4v16h4.6v-8.4L13.8 20H18V4h-4.5v8.4z"
          />
        </svg>
        <span>네이버로 로그인</span>
      </button>
      <button type="button" className="btn btn-apple" onClick={() => onSoon?.("Apple")}>
        <svg className="social-symbol" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#fff"
            d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.7-3.2zM14.5 6.8c.7-.8 1.1-1.9 1-3-.9.1-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2-.5 2.7-1.3z"
          />
        </svg>
        <span>Apple로 로그인</span>
      </button>
      <button type="button" className="btn btn-google" onClick={() => onSoon?.("Google")}>
        <svg className="social-symbol" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 3-4.33 3-7.43z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.34l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.58A10 10 0 0 0 12 22z" />
          <path fill="#FBBC05" d="M6.41 13.99A6.01 6.01 0 0 1 6.1 12c0-.69.12-1.36.31-1.99V7.43H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.57l3.35-2.58z" />
          <path fill="#EA4335" d="M12 5.88c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.95 2.87 14.7 2 12 2A10 10 0 0 0 3.06 7.43l3.35 2.58C7.2 7.64 9.4 5.88 12 5.88z" />
        </svg>
        <span>Google로 로그인</span>
      </button>
    </div>
  );
}
