"use client";

import { PhoneFrame } from "@/components/PhoneFrame";
import { useMe } from "@/lib/useMe";

export default function ChatPage() {
  const { me, loading } = useMe();
  if (loading || !me) {
    return <PhoneFrame tab="chat"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  }

  const locked = me.role === "CAREGIVER";

  return (
    <PhoneFrame tab="chat" chatLocked={locked}>
      <div className="page-title">AI에게 물어보기</div>
      {locked ? (
        <div className="card lock-card">
          <div className="lock-icon">🔒</div>
          <h3>권한이 없습니다</h3>
          <p className="page-sub">
            순자 님이 <b>채팅(CHAT)</b> 항목에 동의하지 않아<br />보호자 계정에서는 열 수 없어요.
          </p>
          <p className="hint">동의 네 칸: 기록 · 서류 · 요약 · <span style={{ color: "var(--danger)", fontWeight: 700 }}>채팅(꺼짐)</span></p>
        </div>
      ) : (
        <>
          <p className="page-sub">지난 기록과 비교하거나 궁금한 점을 물어보세요.</p>
          <div className="chat-thread">
            <div className="chat-bubble-user">지난번 검사랑 비교하면 어때?</div>
            <div className="chat-bubble-ai">
              <div className="ai-label">🤖 AI 답변 · 근거 기반</div>
              지난 5월 검사와 이번 8월 검사를 비교해드릴게요.
              <table className="compare-table">
                <thead>
                  <tr><th>항목</th><th>5월</th><th>8월</th></tr>
                </thead>
                <tbody>
                  <tr><td>LDL 콜레스테롤</td><td>120</td><td>142</td></tr>
                </tbody>
              </table>
              두 수치는 각각 2026.05 / 2026.08 검사결과지에서 확인할 수 있습니다.
              <div className="claim-check">✓ 두 문서 근거로 검증된 답변</div>
            </div>
            <div className="chat-bubble-user">지난번보다 나빠진 거야?</div>
            <div className="chat-bubble-ai">
              <div className="ai-label">🤖 AI 답변 · 근거 기반</div>
              수치와 날짜, 근거만 말씀드릴 수 있어요. 5월 120 → 8월 142로 기록됐다는 사실만 확인되고, &quot;나빠졌다&quot;거나 &quot;약을 늘려야 한다&quot; 같은 판단은 드리지 않아요. 다음 진료에서 의료진과 상의해보시길 권해드려요.
              <div className="claim-check warn">⚠ 근거 없는 판단성 문장은 생성하지 않음</div>
            </div>
          </div>
          <div className="chat-compose">
            <input type="text" placeholder="예: 이번 달 무릎 기록 몇 번이야?" />
            <button className="chat-send" type="button">➤</button>
          </div>
        </>
      )}
    </PhoneFrame>
  );
}
