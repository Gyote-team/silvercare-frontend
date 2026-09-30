"use client";

import { useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useMe } from "@/lib/useMe";

export default function RecordsPage() {
  const { me, loading } = useMe();
  const [writer, setWriter] = useState<"self" | "caregiver">("self");
  const [text, setText] = useState("오늘 계단 오를 때 무릎이 또 시큰거렸어요. 어제보다 조금 더 아픈 것 같아요.");

  if (loading || !me) {
    return <PhoneFrame tab="records"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  }

  return (
    <PhoneFrame tab="records" chatLocked={me.role === "CAREGIVER"} userName={me.name}>
      <div className="page-title">건강 상태 기록</div>
      <p className="page-sub">오늘 몸 상태를 간단히 남겨주세요. AI가 진료 전 요약에 반영해요.</p>
      <div className="writer-select">
        <button className={`writer-chip${writer === "self" ? " active" : ""}`} type="button" onClick={() => setWriter("self")}>
          본인 작성<small>{me.role === "PATIENT" ? me.name : "김순자"}</small>
        </button>
        <button className={`writer-chip${writer === "caregiver" ? " active" : ""}`} type="button" onClick={() => setWriter("caregiver")}>
          보호자 작성<small>{me.role === "CAREGIVER" ? me.name : "김민지 (딸)"}</small>
        </button>
      </div>
      <textarea className="record-area" value={text} onChange={(event) => setText(event.target.value)} />
      <div className="quick-tags">
        {["🦵 무릎 불편", "💊 복약 완료", "😴 수면 상태", "🍚 식사량"].map((tag) => (
          <button key={tag} className="quick-tag" type="button" onClick={() => setText((prev) => `${prev} ${tag}`)}>
            {tag}
          </button>
        ))}
      </div>
      <p className="hint">🎙️ 음성 입력은 다음 단계(Advanced)에서 지원 예정 — MVP는 텍스트 기록만 다룹니다.</p>
      <button className="btn-primary" type="button">기록 저장하기</button>
      <p className="hint" style={{ textAlign: "center" }}>이 기록은 특정 방문(Visit)에 연결되지 않아도 저장돼요.</p>
      <div className="section-label"><span>최근 기록</span><span>더보기 ›</span></div>
      <div className="card" style={{ padding: "4px 16px" }}>
        <div className="past-entry"><div className="dot" /><div className="txt"><b>계단 이용 시 무릎 불편감 기록</b><span>어제 · 본인 작성</span></div></div>
        <div className="past-entry"><div className="dot" /><div className="txt"><b>오래 걸은 뒤 무릎 뻐근함 호소</b><span>3일 전 · 보호자(딸) 작성</span></div></div>
        <div className="past-entry"><div className="dot" /><div className="txt"><b>아침 복약 완료</b><span>3일 전 · 본인 작성</span></div></div>
      </div>
    </PhoneFrame>
  );
}
