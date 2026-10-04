"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { rememberAccount } from "@/lib/accountHint";
import { api, type CareRelation } from "@/lib/api";
import { useMe } from "@/lib/useMe";

function HomeBody() {
  const { me, loading } = useMe();
  const params = useSearchParams();
  const [relations, setRelations] = useState<CareRelation[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [liveMsg, setLiveMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const pendingRelations = relations.filter(
    (item) => item.canAccept || item.canReject || item.canCancel
  );
  const connected = relations.filter((row) => row.status === "ACTIVE");
  const ownPatientId = me?.patientId ?? null;
  const ownProfile = Boolean(me?.hasPatientProfile && ownPatientId);
  const caredPeople = connected.filter((row) => row.patientId !== ownPatientId);
  const caregivers = connected.filter((row) => row.patientId === ownPatientId);
  // 내 프로필은 실제로 나를 돌보는 보호자가 연결된 경우에만 대상 전환 목록에 노출한다.
  const selectableOwnProfile = ownProfile && caregivers.length > 0;
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const activePatientId = selectedPatientId
    ?? (selectableOwnProfile ? ownPatientId : caredPeople[0]?.patientId ?? ownPatientId);
  const documentsHref = activePatientId ? `/documents?patientId=${encodeURIComponent(activePatientId)}` : "/documents";

  useEffect(() => {
    if (me) {
      rememberAccount();
    }
  }, [me]);

  useEffect(() => {
    if (!me) {
      return;
    }
    let lastKey = "";
    let primed = false;

    async function tick() {
      try {
        const rows = await api<CareRelation[]>("/api/care-relations");
        const key = JSON.stringify(rows);
        if (!primed) {
          primed = true;
          lastKey = key;
          setRelations(rows);
          return;
        }
        if (key === lastKey) {
          return;
        }
        const prev = JSON.parse(lastKey) as CareRelation[];
        lastKey = key;
        setRelations(rows);
        const prevById = Object.fromEntries(prev.map((row) => [row.id, row]));
        for (const row of rows) {
          const before = prevById[row.id];
          if (!before && row.status === "REQUESTED") {
            setLiveMsg(`${row.counterpartName} 님에게서 연결 요청이 왔습니다.`);
            break;
          }
        }
      } catch {
        // 다음 주기에 다시 받습니다.
      }
    }

    tick();
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        tick();
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [me]);

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    try {
      const rows = await api<CareRelation[]>("/api/care-relations", {
        method: "POST",
        body: JSON.stringify({ inviteCode })
      });
      setRelations(rows);
      setInviteCode("");
      setLiveMsg("연결 요청을 보냈습니다. 개인이 수락해야 연결됩니다.");
    } catch (error) {
      const key = error && typeof error === "object" && "error" in error ? String(error.error) : "fail";
      if (key === "code") setLiveMsg("없는 코드입니다. 개인이 보여 준 코드를 다시 넣어 주세요.");
      else if (key === "self") setLiveMsg("자기 자신과는 연결할 수 없습니다.");
      else if (key === "duplicate") setLiveMsg("이미 요청했거나 연결되어 있습니다.");
      else setLiveMsg("연결 요청을 보내지 못했습니다.");
    }
  }

  async function mutate(id: string, action: "accept" | "reject" | "cancel") {
    const rows = action === "cancel"
      ? await api<CareRelation[]>(`/api/care-relations/${id}/request`, { method: "DELETE" })
      : await api<CareRelation[]>(`/api/care-relations/${id}/${action}`, { method: "POST" });
    setRelations(rows);
  }

  async function copyInvite() {
    const code = me?.inviteCode ?? "";
    if (!code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      setLiveMsg("복사를 하지 못했습니다. 코드를 길게 눌러 복사해 주세요.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (loading || !me) {
    return (
      <PhoneFrame tab="home">
        <p className="page-sub">불러오는 중…</p>
      </PhoneFrame>
    );
  }

  const ok = params.get("ok");
  const err = params.get("error");

  return (
    <PhoneFrame tab="home" userName={me.name}>
      <div className="home-hero">
        <div className="home-header">
          <div className="greeting">
            안녕하세요
            <div className="greeting-row">
              <b>{me.name} 님</b>
            </div>
            {connected.map((row) => (
              <section key={row.id} className="bond-card">
                <div className="bond-main">
                  <div className="bond-avatars" aria-hidden="true">
                    <span className="bond-avatar me">{me.name.slice(0, 1)}</span>
                    <span className="bond-avatar them">{row.counterpartName.slice(0, 1)}</span>
                  </div>
                  <div className="bond-copy">
                    <strong>{row.counterpartName}</strong>
                    <span>{row.patientId === ownPatientId ? "나를 돌보는 보호자" : "내가 돌보는 개인"}</span>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {ok === "requested" ? <p className="msg">연결 요청을 보냈습니다. 개인이 수락해야 연결됩니다.</p> : null}
      {liveMsg ? <p className="msg">{liveMsg}</p> : null}
      {err === "code" ? <p className="msg error">없는 코드입니다. 개인이 보여 준 코드를 다시 넣어 주세요.</p> : null}

      <section className="target-card">
        <p className="card-label">현재 보고 있는 대상</p>
        {selectableOwnProfile ? <button className={`target-option${activePatientId === ownPatientId ? " active" : ""}`} onClick={() => setSelectedPatientId(ownPatientId)}><b>{me.name} 님</b><span>내 건강 프로필</span></button> : null}
        {caredPeople.map((row) => <button key={row.id} className={`target-option${activePatientId === row.patientId ? " active" : ""}`} onClick={() => setSelectedPatientId(row.patientId)}><b>{row.counterpartName} 님</b><span>내가 돌보는 개인</span></button>)}
        {!ownProfile && caredPeople.length === 0 ? <p>내 계정에서 건강 프로필을 만들거나 개인을 연결해 주세요.</p> : null}
      </section>

      {ownProfile && connected.length === 0 ? (
        <section className="card">
          <p className="card-label">초대 코드</p>
          <div className="invite-box">
            <div className="invite-code">{me.inviteCode}</div>
            <button
              className={`invite-copy${copied ? " is-copied" : ""}`}
              type="button"
              onClick={copyInvite}
              aria-label={copied ? "복사됨" : "초대 코드 복사"}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12.5 9.5 17 19 7"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  />
                </svg>
              )}
            </button>
          </div>
          <p>{copied ? "코드를 복사했습니다." : "보호자에게 이 코드를 보여 주세요. 이 코드로는 로그인하지 못합니다."}</p>
        </section>
      ) : null}

      {caredPeople.length === 0 ? (
        <section className="card">
          <p className="card-label">가족 연결</p>
          <p>개인이 보여 준 초대 코드를 넣습니다. 요청만으로는 기록을 볼 수 없습니다.</p>
          <form className="code-form" onSubmit={requestLink}>
            <label className="sr" htmlFor="inviteCode">초대 코드</label>
            <input
              id="inviteCode"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              maxLength={8}
              placeholder="예: ABC-DEF"
              required
            />
            <button className="btn-primary" type="submit">연결 요청</button>
          </form>
        </section>
      ) : null}

      {pendingRelations.length > 0 ? (
        <section className="card">
          <p className="card-label">확인할 요청</p>
          <ul className="relation-list">
            {pendingRelations.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.counterpartName}</strong>
                </div>
                <div className="row-actions">
                  {item.canAccept ? (
                    <button className="btn-tiny btn-primary" type="button" onClick={() => mutate(item.id, "accept")}>수락</button>
                  ) : null}
                  {item.canReject ? (
                    <button className="btn-tiny btn-out" type="button" onClick={() => mutate(item.id, "reject")}>거절</button>
                  ) : null}
                  {item.canCancel ? (
                    <button className="btn-tiny btn-out" type="button" onClick={() => mutate(item.id, "cancel")}>취소</button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="action-grid">
        <Link className="action-card a1" href="/records">
          <div className="icon">📝</div>
          <h3>오늘 상태 기록</h3>
          <p>텍스트나 음성으로 간단히</p>
        </Link>
        <Link className="action-card a2" href="/records">
          <div className="icon">🤝</div>
          <h3>보호자 기록</h3>
          <p>가족이 대신 기록하기</p>
        </Link>
        <Link className="action-card a3" href={documentsHref}>
          <div className="icon">📄</div>
          <h3>병원 서류 등록</h3>
          <p>촬영하면 AI가 정리해요</p>
        </Link>
        <Link className="action-card a4" href="/timeline">
          <div className="icon">🗂️</div>
          <h3>지난 진료 보기</h3>
          <p>Visit 타임라인 확인</p>
        </Link>
      </div>

      <div className="section-label">
        <span>진료 전 AI 요약</span>
        <Link href="/timeline">전체보기 ›</Link>
      </div>
      <Link className="summary-preview" href="/timeline">
        <span className="tag">10월 15일 재진 대비 준비 중</span>
        <p>최근 2주간 무릎 불편감 <b>7회</b> 기록됨 (최초 8월 12일). 계단 이용 시 특히 불편, 최근 기록 빈도 증가 추세.</p>
        <div className="go">의료진에게 전달할 요약 전체 보기 →</div>
      </Link>

      <div className="section-label">
        <span>오늘 할 일</span>
        <Link href={documentsHref}>문서함 ›</Link>
      </div>
      <div className="card" style={{ padding: "6px 16px" }}>
        <div className="mini-row">
          <div className="mini-icon">💊</div>
          <div className="mini-text"><b>복약 안내 확인</b><span>아침·저녁 식후 30분</span></div>
        </div>
        <div className="mini-row">
          <div className="mini-icon">📅</div>
          <div className="mini-text"><b>10월 15일 재진 일정</b><span>정형외과 · 오전 10시</span></div>
        </div>
        <div className="mini-row">
          <div className="mini-icon">🚶</div>
          <div className="mini-text"><b>생활 주의사항</b><span>계단 이용 시 난간 이용 권장</span></div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeBody />
    </Suspense>
  );
}
