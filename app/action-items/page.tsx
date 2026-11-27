"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import { api, type CareRelation, type Me } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { actionError, actionQuery, approvalLabels, type ApprovalStatus } from "@/lib/actionItems";
import { CandidateList } from "@/components/CandidateList";
import "./action-items.css";

function CandidateScope({ me }: { me: Me }) {
  const params = useSearchParams();
  const router = useRouter();
  const [targets, setTargets] = useState<CareRelation[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const caregiver = me.role === "CAREGIVER";
  const requestedStatus = params.get("approvalStatus") ?? "";
  const status = Object.hasOwn(approvalLabels, requestedStatus) ? requestedStatus as ApprovalStatus : undefined;
  const patientId = caregiver ? params.get("patientId") ?? (targets?.length === 1 ? targets[0].patientId : "") : undefined;
  useEffect(() => {
    if (!caregiver) return;
    const controller = new AbortController();
    setError(""); setTargets(null);
    api<CareRelation[]>("/api/care-relations", { signal: controller.signal }).then(rows => {
      if (!controller.signal.aborted) setTargets(rows.filter(row => row.status === "ACTIVE"));
    }).catch(caught => { if (!controller.signal.aborted) setError(actionError(caught)); });
    return () => controller.abort();
  }, [caregiver, attempt]);
  const allowed = me.role === "PATIENT" || (caregiver && targets?.some(row => row.patientId === patientId));
  return <>
    {caregiver && <section className="candidate-card"><label htmlFor="candidate-patient">확인할 개인</label>
      {targets && <select id="candidate-patient" value={patientId} onChange={e => router.replace(`/action-items${actionQuery(e.target.value, status)}`)}><option value="">개인을 선택해 주세요</option>{targets.map(row => <option key={row.id} value={row.patientId}>{row.counterpartName}</option>)}</select>}
      {!targets && !error && <p role="status">연결된 개인을 확인하고 있어요…</p>}
      {error && <div role="alert"><p>{error}</p><button className="candidate-button" onClick={() => setAttempt(value => value + 1)}>연결 다시 확인</button></div>}
      {targets?.length === 0 && <p>연결된 개인이 없어요. <Link href="/account">개인 연결 관리</Link></p>}
      {!!targets?.length && !allowed && <p>현재 연결된 개인을 선택해 주세요.</p>}
    </section>}
    <nav className="candidate-filters" aria-label="후보 상태">{([undefined, ...Object.keys(approvalLabels)] as (ApprovalStatus | undefined)[]).map(value => <Link key={value ?? "all"} aria-current={status === value ? "page" : undefined} href={`/action-items${actionQuery(patientId, value)}`}>{value ? approvalLabels[value] : "전체"}</Link>)}</nav>
    {allowed && <CandidateList key={`${me.id}:${me.role}:${patientId ?? "self"}:${status ?? "all"}`} patientId={patientId || undefined} status={status} />}
  </>;
}
function CandidatePageBody() {
  const { me, loading } = useMe();
  return <PhoneFrame tab="home" userName={me?.name} scrollClassName="candidate-screen"><Link className="candidate-back" href="/home">‹ 홈으로</Link>
    <header className="candidate-heading"><span>문서에서 찾은 다음 할 일</span><h1>할 일 후보</h1><p>복약·재진·검사 안내를 원본 근거와 함께 확인해요.<br />후보의 예상 일시는 확정된 일정이 아니에요.</p></header>
    {loading ? <p role="status">불러오는 중…</p> : me ? <CandidateScope key={`${me.id}:${me.role}`} me={me} /> : <p role="alert">계정을 확인하지 못했어요. <Link href="/login">다시 로그인</Link></p>}
  </PhoneFrame>;
}
export default function CandidatePage() { return <Suspense><CandidatePageBody /></Suspense>; }
