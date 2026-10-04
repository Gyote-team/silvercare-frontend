"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useMe } from "@/lib/useMe";

function RecordsBody() {
  const { me, loading } = useMe();
  const params = useSearchParams();
  const [writer, setWriter] = useState<"self" | "caregiver">("self");
  const [text, setText] = useState("오늘 계단 오를 때 무릎이 또 시큰거렸어요. 어제보다 조금 더 아픈 것 같아요.");

  if (loading || !me) {
    return <PhoneFrame tab="records"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  }

  const patientId = params.get("patientId");
  const viewingOwnProfile = !patientId || patientId === me.patientId;
  const targetName = params.get("name") ?? (viewingOwnProfile ? me.name : "연결된 개인");

  return (
    <PhoneFrame tab="records" userName={me.name}>
      <div className="page-title">{viewingOwnProfile ? "내 건강 상태 기록" : `${targetName} 님 건강 상태 기록`}</div>
      <p className="page-sub">{viewingOwnProfile ? "내 몸 상태를 간단히 남겨주세요. AI가 진료 전 요약에 반영해요." : `${targetName} 님의 상태를 보호자 기록으로 남겨요.`}</p>
      {viewingOwnProfile ? <div className="writer-select">
        <button className={`writer-chip${writer === "self" ? " active" : ""}`} type="button" onClick={() => setWriter("self")}>
          내 기록<small>{me.name}</small>
        </button>
        <button className={`writer-chip${writer === "caregiver" ? " active" : ""}`} type="button" onClick={() => setWriter("caregiver")}>
          보호자 기록<small>연결된 보호자가 작성</small>
        </button>
      </div> : <p className="tag">보호자 작성 · {targetName} 님</p>}
      <textarea className="record-area" value={text} onChange={(event) => setText(event.target.value)} />
      <div className="quick-tags">
        {["🦵 무릎 불편", "💊 복약 완료", "😴 수면 상태", "🍚 식사량"].map((tag) => (
          <button key={tag} className="quick-tag" type="button" onClick={() => setText((prev) => `${prev} ${tag}`)}>
            {tag}
          </button>
        ))}
      </div>
      <p className="hint">🎙️ 음성 입력은 다음 단계(Advanced)에서 지원 예정 — MVP는 텍스트 기록만 다룹니다.</p>
      <button className="btn-primary" type="button">{viewingOwnProfile ? "내 기록 저장하기" : "보호자 기록 저장하기"}</button>
      <p className="hint" style={{ textAlign: "center" }}>이 기록은 특정 방문(Visit)에 연결되지 않아도 저장돼요.</p>
      <div className="section-label"><span>{viewingOwnProfile ? "내 최근 기록" : `${targetName} 님 최근 기록`}</span><span>더보기 ›</span></div>
      <div className="card" style={{ padding: "4px 16px" }}>
        <div className="past-entry"><div className="dot" /><div className="txt"><b>계단 이용 시 무릎 불편감 기록</b><span>어제 · 본인 작성</span></div></div>
        <div className="past-entry"><div className="dot" /><div className="txt"><b>오래 걸은 뒤 무릎 뻐근함 호소</b><span>3일 전 · 보호자(딸) 작성</span></div></div>
        <div className="past-entry"><div className="dot" /><div className="txt"><b>아침 복약 완료</b><span>3일 전 · 본인 작성</span></div></div>
      </div>
    </PhoneFrame>
  );
}

export default function RecordsPage() {
  return (
    <Suspense>
      <RecordsBody />
    </Suspense>
  );
}
