"use client";

import { kakaoLoginUrl } from "@/lib/api";

type KakaoButtonProps = {
  label: string;
  busy?: boolean;
  onBusy?: () => void;
};

export function KakaoButton({ label, busy = false, onBusy }: KakaoButtonProps) {
  return (
    <a
      className={`btn btn-kakao${busy ? " is-busy" : ""}`}
      href={kakaoLoginUrl()}
      onClick={onBusy}
    >
      <svg className="kakao-symbol" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#000"
          d="M12 3c5.8 0 10.5 3.66 10.5 8.19 0 4.52-4.7 8.18-10.5 8.18a13.5 13.5 0 0 1-3.4-.43l-3.77 2.45a.5.5 0 0 1-.76-.44v-3.29A7.87 7.87 0 0 1 1.5 11.19C1.5 6.66 6.2 3 12 3z"
        />
      </svg>
      <span>{busy ? "카카오 연결 중" : label}</span>
    </a>
  );
}
