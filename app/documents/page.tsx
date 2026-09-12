"use client";

import { useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useMe } from "@/lib/useMe";

const items = [
  { title: "복약 안내 확인", meta: "아침·저녁 식후 30분" },
  { title: "10월 15일 재진 일정", meta: "정형외과" },
  { title: "다음 방문 전 검사 일정 확인", meta: "추적관찰 안내에 따름" },
  { title: "생활 주의사항 확인", meta: "저지방 식단 권장" }
];

export default function DocumentsPage() {
  const { me, loading } = useMe();
  const [checked, setChecked] = useState([false, false, false, false]);

  if (loading || !me) {
    return <PhoneFrame tab="documents"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  }

  return (
    <PhoneFrame tab="documents" chatLocked={me.role === "CAREGIVER"}>
      <div className="page-title">병원 서류 등록</div>
      <p className="page-sub">촬영하거나 PDF로 올리면 AI가 종류를 나누고 쉽게 설명해드려요.</p>
      <div className="doc-upload-zone">
        <div className="icon-circle">📷</div>
        <h4>사진 촬영 또는 파일 업로드</h4>
        <p>검사결과지 · 처방전 · 퇴원안내서 지원</p>
      </div>
      <p className="hint">서류는 아래 네 종류만 다뤄요.</p>
      <div className="doc-chip-row">
        <div className="doc-chip active">검사결과지</div>
        <div className="doc-chip">처방전·복약안내</div>
        <div className="doc-chip">진단서</div>
        <div className="doc-chip">퇴원·진료 안내문</div>
      </div>
      <div className="card">
        <div className="tag orange" style={{ marginBottom: 12 }}>✓ AI 분석 완료</div>
        <div className="compare-label origin">원문</div>
        <div className="origin-box">LDL-C: 162 mg/dL<br />Reference: &lt; 130 mg/dL<br />추적관찰 요망</div>
        <div className="compare-label easy">쉬운 설명</div>
        <div className="easy-box">
          LDL 콜레스테롤 수치가 참고 범위보다 높게 기록되어 있습니다. 결과지에는 추적 관찰이 필요하다는 안내가 적혀 있습니다.
          <div className="source-link">📎 원문 검사결과지 3번째 줄 근거로 확인</div>
        </div>
      </div>
      <div className="section-label"><span>이 서류에서 찾은 할 일 (후보)</span><span /></div>
      <p className="hint">확인을 눌러야 일정에 들어가요. 누르지 않으면 후보로만 남아요.</p>
      <div className="card" style={{ padding: "4px 16px" }}>
        {items.map((item, index) => (
          <div
            key={item.title}
            className="action-item-row"
            onClick={() => setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)))}
          >
            <div className={`checkbox${checked[index] ? " checked" : ""}`}>✓</div>
            <div className="txt">
              <b>{item.title}</b>
              <span>{item.meta} · <span className="tag orange" style={{ padding: "1px 7px", fontSize: 10 }}>후보</span></span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-secondary" type="button">확인한 항목만 일정에 담기</button>
    </PhoneFrame>
  );
}
