"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import { api, logout, type CareRelation } from "@/lib/api";
import { useMe } from "@/lib/useMe";

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function AccountPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [relations, setRelations] = useState<CareRelation[] | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const current = me;

  useEffect(() => {
    if (!me) return;
    api<CareRelation[]>("/api/care-relations").then(setRelations).catch(() => setRelations([]));
  }, [me]);

  if (loading || !current) return <PhoneFrame tab="home"><p className="page-sub">불러오는 중…</p></PhoneFrame>;

  const all = relations ?? [];
  const myProfileRelations = current.patientId ? all.filter((row) => row.patientId === current.patientId) : [];
  const caringRelations = all.filter((row) => row.patientId !== current.patientId);
  const activeMyCaregivers = myProfileRelations.filter((row) => row.status === "ACTIVE");
  const activePeople = caringRelations.filter((row) => row.status === "ACTIVE");

  async function requestConnection() {
    try {
      const rows = await api<CareRelation[]>("/api/care-relations", { method: "POST", body: JSON.stringify({ inviteCode }) });
      setRelations(rows); setInviteCode(""); setShowConnect(false);
      setMessage("연결 요청을 보냈습니다. 상대방이 수락하면 기록을 볼 수 있어요.");
    } catch { setMessage("연결 요청을 보내지 못했습니다. 초대 코드를 확인해 주세요."); }
  }

  async function unlink(row: CareRelation) {
    if (!window.confirm(`${row.counterpartName} 님과 연결을 해제할까요?`)) return;
    try { setRelations(await api<CareRelation[]>(`/api/care-relations/${row.id}`, { method: "DELETE" })); setMessage("연결을 해제했습니다."); }
    catch { setMessage("연결을 해제하지 못했습니다."); }
  }

  async function onLogout() {
    if (!window.confirm("로그아웃할까요?")) return;
    await logout(); router.replace("/login");
  }

  return (
    <PhoneFrame tab="home" userName={current.name}>
      <div className="page-title">내 계정</div>
      <section className="account-hero"><span className="account-avatar large" aria-hidden="true">{current.name.slice(0, 1)}</span><div className="account-hero-copy"><strong>{current.name} 님</strong><span className="account-role-chip">통합 계정</span></div></section>
      <p className="account-section-title">계정 정보</p>
      <ul className="settings-group"><li className="settings-row"><span className="settings-label">로그인 방식</span><span className="settings-value">{current.loginProvider === "DEMO" ? "시연용 계정" : "카카오"}</span></li><li className="settings-row"><span className="settings-label">가입일</span><span className="settings-value">{formatDate(current.createdAt)}</span></li><li className="settings-row"><span className="settings-label">사용 기능</span><span className="settings-value">내 건강관리 · 가족 돌봄</span></li></ul>
      <p className="account-section-title">내 건강 프로필</p>
      <ul className="settings-group">
        <><li className="settings-row"><span className="settings-label">보호자 초대 코드</span><b className="invite-inline">{current.inviteCode}</b></li><li className="settings-row"><span className="settings-label">나를 돌보는 보호자</span><span className="settings-value">{activeMyCaregivers.length}명</span></li></>
      </ul>
      <p className="account-section-title">내가 돌보는 개인</p>
      <ul className="settings-group">
        {activePeople.map((row) => <li key={row.id} className="settings-row"><span className="linked-person"><span className="linked-avatar">{row.counterpartName.slice(0, 1)}</span><span className="linked-copy"><b>{row.counterpartName}</b><small>{formatDate(row.acceptedAt)}부터 연결</small></span></span><button className="linked-unlink" onClick={() => unlink(row)}>연결 해제</button></li>)}
        {activePeople.length === 0 ? <li className="settings-empty"><p>아직 돌보는 개인이 없어요.</p></li> : null}
        <li><button className="settings-row settings-link" onClick={() => setShowConnect(true)}><span className="settings-label strong">개인 추가 연결</span><span className="settings-chevron">›</span></button></li>
      </ul>
      {message ? <p className="msg account-msg">{message}</p> : null}
      <p className="account-section-title">약관 및 정책</p>
      <ul className="settings-group"><li><Link className="settings-row settings-link" href="/terms"><span className="settings-label strong">이용약관</span><span>›</span></Link></li><li><Link className="settings-row settings-link" href="/privacy"><span className="settings-label strong">개인정보 처리방침</span><span>›</span></Link></li></ul>
      <ul className="settings-group account-actions"><li><button className="settings-row settings-link" onClick={onLogout}><span className="settings-label strong">로그아웃</span><span>›</span></button></li><li><Link className="settings-row settings-link" href="/withdraw"><span className="settings-label danger">회원 탈퇴</span><span>›</span></Link></li></ul>
      {showConnect ? <div className="connection-overlay" role="dialog" aria-modal="true" aria-label="개인 추가 연결"><section className="connection-modal"><button className="connection-close" onClick={() => setShowConnect(false)} aria-label="닫기">×</button><p className="card-label">개인 추가 연결</p><p>개인이 알려 준 초대 코드를 입력해 주세요. 상대방이 수락하면 연결됩니다.</p><input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="예: ABC-DEF" maxLength={8} /><button className="btn-primary" onClick={requestConnection} disabled={!inviteCode.trim()}>연결 요청</button></section></div> : null}
    </PhoneFrame>
  );
}
