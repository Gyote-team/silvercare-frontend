"use client";

import { PhoneFrame } from "@/components/PhoneFrame";
import { useMe } from "@/lib/useMe";

export default function TimelinePage() {
  const { me, loading } = useMe();
  if (loading || !me) {
    return <PhoneFrame tab="timeline"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  }

  return (
    <PhoneFrame tab="timeline" chatLocked={me.role === "CAREGIVER"}>
      <div className="page-title">진료 타임라인</div>
      <p className="page-sub">Visit 단위로 기록과 서류, 일정이 시간순으로 이어져요.</p>
      <div className="timeline-wrap">
        <div className="visit-node future">
          <div className="visit-date">10월 15일 (예정)</div>
          <div className="visit-card">
            <h4>정형외과 재진</h4>
            <div className="meta"><span className="tag orange">진료 전 요약 준비됨</span></div>
            <p>최근 2주 무릎 불편 7회 기록 반영된 요약본이 자동 생성되었습니다.</p>
          </div>
        </div>
        <div className="visit-node">
          <div className="visit-date">2026.08.14</div>
          <div className="visit-card">
            <h4>정형외과 방문 · 혈액검사</h4>
            <div className="meta"><span className="tag">서류 2건</span><span className="tag">기록 3건</span></div>
            <p>LDL 콜레스테롤 추적관찰 소견. 복약 안내 등록됨.</p>
          </div>
        </div>
        <div className="visit-node">
          <div className="visit-date">2026.05.09</div>
          <div className="visit-card">
            <h4>정형외과 방문 · 혈액검사</h4>
            <div className="meta"><span className="tag">서류 1건</span></div>
            <p>검사 A 항목 120으로 기록. 특이 소견 없음.</p>
          </div>
        </div>
        <div className="visit-node">
          <div className="visit-date">2026.02.21</div>
          <div className="visit-card">
            <h4>내과 정기검진</h4>
            <div className="meta"><span className="tag">서류 1건</span></div>
            <p>연간 정기검진 결과 등록.</p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
