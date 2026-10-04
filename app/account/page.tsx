"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import { api, logout, type CareRelation, type Me } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const ROLE_LABEL: Record<string, string> = {
  PATIENT: "개인",
  CAREGIVER: "보호자",
  ADMIN: "관리자"
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function KakaoSymbol() {
  return (
    <span className="provider-badge kakao" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          fill="#000"
          d="M12 3c5.8 0 10.5 3.66 10.5 8.19 0 4.52-4.7 8.18-10.5 8.18a13.5 13.5 0 0 1-3.4-.43l-3.77 2.45a.5.5 0 0 1-.76-.44v-3.29A7.87 7.87 0 0 1 1.5 11.19C1.5 6.66 6.2 3 12 3z"
        />
      </svg>
    </span>
  );
}

function ProviderLabel({ me }: { me: Me }) {
  if (me.loginProvider === "DEMO") {
    return (
      <span className="provider-value">
        <span className="provider-badge demo" aria-hidden="true">D</span>
        시연용 계정
      </span>
    );
  }
  return (
    <span className="provider-value">
      <KakaoSymbol />
      카카오
    </span>
  );
}

export default function AccountPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [relations, setRelations] = useState<CareRelation[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!me) {
      return;
    }
    api<CareRelation[]>("/api/care-relations")
      .then(setRelations)
      .catch(() => setRelations([]));
  }, [me]);

  if (loading || !me) {
    return (
      <PhoneFrame tab="home">
        <p className="page-sub">불러오는 중…</p>
      </PhoneFrame>
    );
  }

  const patient = me.role === "PATIENT";
  const connected = (relations ?? []).filter((row) => row.status === "ACTIVE");
  const pendingCount = (relations ?? []).filter((row) => row.status === "REQUESTED").length;

  async function onLogout() {
    const ok = window.confirm("로그아웃하면 이 기기에서 로그인이 풀립니다. 로그아웃할까요?");
    if (!ok) {
      return;
    }
    await logout();
    router.replace("/login");
  }

  async function unlink(row: CareRelation) {
    const label = patient ? `보호자 ${row.counterpartName}` : row.counterpartName;
    const detail = patient
      ? "끊으면 보호자는 이 기록을 보지 못합니다."
      : "끊으면 이 분의 기록을 보지 못합니다.";
    const ok = window.confirm(`${label} 님과 연결을 끊을까요?\n${detail}`);
    if (!ok) {
      return;
    }
    try {
      const rows = await api<CareRelation[]>(`/api/care-relations/${row.id}`, { method: "DELETE" });
      setRelations(rows);
      setMessage("연결을 끊었습니다.");
    } catch {
      setMessage("연결을 끊지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  // 개인 계정의 초대 코드를 복사해 추가 보호자 연결에 사용한다.
  async function copyInvite() {
    if (!me?.inviteCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(me.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 복사 권한이 없으면 코드를 직접 보고 입력하면 된다.
    }
  }

  // 보호자가 다른 개인의 초대 코드로 추가 연결을 요청하고 목록을 갱신한다.
  async function requestAdditionalConnection(event: FormEvent) {
    event.preventDefault();
    setRequesting(true);
    try {
      const rows = await api<CareRelation[]>("/api/care-relations", {
        method: "POST",
        body: JSON.stringify({ inviteCode })
      });
      setRelations(rows);
      setInviteCode("");
      setShowAddConnection(false);
      setMessage("연결 요청을 보냈습니다. 개인이 수락하면 연결됩니다.");
    } catch (error) {
      const key = error && typeof error === "object" && "error" in error ? String(error.error) : "fail";
      if (key === "code") setMessage("없는 코드입니다. 개인이 보여 준 코드를 다시 넣어 주세요.");
      else if (key === "self") setMessage("자기 자신과는 연결할 수 없습니다.");
      else if (key === "duplicate") setMessage("이미 요청했거나 연결되어 있습니다.");
      else setMessage("연결 요청을 보내지 못했습니다.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <PhoneFrame tab="home" chatLocked={me.role === "CAREGIVER"} userName={me.name}>
      <div className="page-title">내 계정</div>

      <section className="account-hero">
        <span className="account-avatar large" aria-hidden="true">{me.name.slice(0, 1)}</span>
        <div className="account-hero-copy">
          <strong>{me.name} 님</strong>
          <span className="account-role-chip">{ROLE_LABEL[me.role] ?? me.role}</span>
        </div>
      </section>

      <p className="account-section-title">계정 정보</p>
      <ul className="settings-group">
        <li className="settings-row">
          <span className="settings-label">로그인 방식</span>
          <ProviderLabel me={me} />
        </li>
        <li className="settings-row">
          <span className="settings-label">가입일</span>
          <span className="settings-value">{formatDate(me.createdAt)}</span>
        </li>
        <li className="settings-row">
          <span className="settings-label">계정 유형</span>
          <span className="settings-value">{ROLE_LABEL[me.role] ?? me.role} 계정</span>
        </li>
        {patient && me.inviteCode ? (
          <li className="settings-row">
            <span className="settings-label">초대 코드</span>
            <span className="settings-value">
              <b className="invite-inline">{me.inviteCode}</b>
              <button className="settings-inline-btn" type="button" onClick={copyInvite}>
                {copied ? "복사됨" : "복사"}
              </button>
            </span>
          </li>
        ) : null}
      </ul>

      <p className="account-section-title">{patient ? "연결된 보호자" : "연결된 가족"}</p>
      {message ? <p className="msg account-msg">{message}</p> : null}
      <ul className="settings-group">
        {relations === null ? (
          <li className="settings-row">
            <span className="settings-label">불러오는 중…</span>
          </li>
        ) : connected.length === 0 ? (
          <li className="settings-empty">
            <p>아직 연결된 {patient ? "보호자가" : "가족이"} 없어요.</p>
            <Link href="/home">{patient ? "초대 코드 보여 주기" : "초대 코드로 연결하기"} ›</Link>
          </li>
        ) : (
          connected.map((row) => (
            <li key={row.id} className="settings-row">
              <span className="linked-person">
                <span className="linked-avatar" aria-hidden="true">{row.counterpartName.slice(0, 1)}</span>
                <span className="linked-copy">
                  <b>{row.counterpartName}</b>
                  <small>{formatDate(row.acceptedAt)}부터 연결</small>
                </span>
              </span>
              {row.canRevoke ? (
                <button className="linked-unlink" type="button" onClick={() => unlink(row)}>
                  연결 해제
                </button>
              ) : null}
            </li>
          ))
        )}
        <li>
          <button className="settings-row settings-link" type="button" onClick={() => setShowAddConnection(true)}>
            <span className="settings-label strong">{patient ? "보호자 추가 연결" : "개인 추가 연결"}</span>
            <span className="settings-chevron">›</span>
          </button>
        </li>
        {pendingCount > 0 ? (
          <li>
            <Link className="settings-row settings-link" href="/home">
              <span className="settings-label">대기 중인 연결 요청</span>
              <span className="settings-value">{pendingCount}건 ›</span>
            </Link>
          </li>
        ) : null}
      </ul>

      <p className="account-section-title">약관 및 정책</p>
      <ul className="settings-group">
        <li>
          <Link className="settings-row settings-link" href="/terms">
            <span className="settings-label strong">이용약관</span>
            <span className="settings-chevron">›</span>
          </Link>
        </li>
        <li>
          <Link className="settings-row settings-link" href="/privacy">
            <span className="settings-label strong">개인정보 처리방침</span>
            <span className="settings-chevron">›</span>
          </Link>
        </li>
      </ul>

      <ul className="settings-group account-actions">
        <li>
          <button className="settings-row settings-link" type="button" onClick={onLogout}>
            <span className="settings-label strong">로그아웃</span>
            <span className="settings-chevron">›</span>
          </button>
        </li>
        <li>
          <Link className="settings-row settings-link" href="/withdraw">
            <span className="settings-label danger">회원 탈퇴</span>
            <span className="settings-chevron">›</span>
          </Link>
        </li>
      </ul>

      {/* 홈으로 이동하지 않고 내 계정 화면에서 추가 연결을 처리한다. */}
      {showAddConnection ? (
        <div className="connection-modal-backdrop" role="presentation" onMouseDown={() => setShowAddConnection(false)}>
          <section className="connection-modal" role="dialog" aria-modal="true" aria-labelledby="add-connection-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="connection-modal-handle" aria-hidden="true" />
            <div className="connection-modal-header">
              <div>
                <p className="card-label">추가 연결</p>
                <h2 id="add-connection-title">{patient ? "보호자 추가 연결" : "개인 추가 연결"}</h2>
              </div>
              <button className="connection-modal-close" type="button" onClick={() => setShowAddConnection(false)} aria-label="닫기">×</button>
            </div>
            {patient ? (
              <>
                <p>새 보호자에게 아래 초대 코드를 전달해 주세요.</p>
                <div className="invite-box">
                  <div className="invite-code">{me.inviteCode ?? "-"}</div>
                  <button className={`invite-copy${copied ? " is-copied" : ""}`} type="button" onClick={copyInvite}>
                    {copied ? "✓" : "복사"}
                  </button>
                </div>
                <p className="connection-modal-hint">코드만으로는 기록을 볼 수 없고, 보호자의 요청을 수락해야 연결됩니다.</p>
              </>
            ) : (
              <form className="code-form" onSubmit={requestAdditionalConnection}>
                <p>개인이 알려 준 초대 코드를 입력해 주세요.</p>
                <label className="sr" htmlFor="additionalInviteCode">초대 코드</label>
                <input id="additionalInviteCode" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} maxLength={8} placeholder="예: ABC-DEF" required />
                <button className="btn-primary" type="submit" disabled={requesting}>{requesting ? "요청 중…" : "연결 요청"}</button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </PhoneFrame>
  );
}
