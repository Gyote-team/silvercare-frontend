"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhoneFrame } from "./PhoneFrame";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { CandidateActions } from "./CandidateActions";
import { actionDate, actionError, actionQuery, approvalLabels, typeLabels, type ActionItem, type ApprovalStatus } from "@/lib/actionItems";
import "@/app/action-items/action-items.css";

export function CandidateContent({ actionItemId, query = "" }: { actionItemId: string; query?: string }) {
  const [item, setItem] = useState<ActionItem | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setItem(null); setError("");
    api<ActionItem>(`/api/action-items/${encodeURIComponent(actionItemId)}`, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setItem(value);
    }).catch(caught => { if (!controller.signal.aborted) setError(actionError(caught)); });
    return () => controller.abort();
  }, [actionItemId, attempt]);
  if (error) return <div className="candidate-card" role="alert"><p>{error}</p><button className="candidate-button" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button><Link href="/login">로그인으로 이동</Link></div>;
  if (!item) return <p role="status">후보를 불러오는 중…</p>;
  const returnTo = `/action-items/${encodeURIComponent(actionItemId)}${query}`;
  const documentQuery = new URLSearchParams({ patientId: item.patientId, returnTo });
  return <>
    <section className="candidate-card"><div className="candidate-tags"><span className={`candidate-status ${item.approvalStatus.toLowerCase()}`}>{approvalLabels[item.approvalStatus]}</span><span>{typeLabels[item.type]}</span></div>
      <h1>{item.title}</h1>{item.description && <p className="candidate-description">{item.description}</p>}
      <dl className="candidate-facts"><div><dt>예상 일시</dt><dd>{item.estimatedAt ? actionDate(item.estimatedAt) : "미정"}</dd></div><div><dt>후보 생성일</dt><dd>{actionDate(item.createdAt)}</dd></div>{item.approvedAt && <div><dt>승인일</dt><dd>{actionDate(item.approvedAt)}</dd></div>}</dl>
      {item.approvalStatus === "CANCELED" && <p className="candidate-notice">{item.sourceDocumentDeleted || item.cancelReason === "DOCUMENT_DELETED" ? "원본 문서가 삭제되어 취소된 후보예요." : "취소된 후보예요. 연결된 방문과 원본 문서의 상태를 확인해 주세요."}</p>}
      {item.approvalStatus === "PENDING" && <p className="candidate-notice">아직 확인 전인 후보예요. 예상 일시는 확정된 일정이 아니니 원본 안내를 함께 확인해 주세요.</p>}
    </section>
    <CandidateActions key={`${item.actionItemId}:${item.approvalStatus}:${attempt}`} item={item} onReload={() => setAttempt(value => value + 1)} />
    <section className="candidate-card"><h2>원본 근거</h2>{item.sourceDocumentDeleted ? <p>원본 문서가 삭제되어 문서와 근거를 볼 수 없어요.</p> : <>
      <p>{item.documentName ?? "출처 문서"}</p>
      {item.source ? <blockquote>{item.source.pageNo != null && <span>{item.source.pageNo}페이지</span>}<p>{item.source.sourceText}</p></blockquote> : <p>연결된 원문 근거가 없어요. 출처 문서의 안내를 직접 확인해 주세요.</p>}
      <Link className="candidate-button" href={`/documents/${encodeURIComponent(item.documentId)}?${documentQuery}`}>출처 문서 보기 ›</Link>
    </>}</section>
    <Link className="candidate-button" href={`/visits/${encodeURIComponent(item.visitId)}`}>연결된 방문 보기 ›</Link>
  </>;
}
function DetailBody({ actionItemId }: { actionItemId: string }) {
  const { me, loading } = useMe();
  const params = useSearchParams();
  const value = params.get("approvalStatus") ?? "";
  const status = Object.hasOwn(approvalLabels, value) ? value as ApprovalStatus : undefined;
  const query = actionQuery(me?.role === "CAREGIVER" ? params.get("patientId") ?? undefined : undefined, status);
  return <PhoneFrame tab="home" userName={me?.name} scrollClassName="candidate-screen"><Link className="candidate-back" href={`/action-items${query}`}>‹ 할 일 후보 목록</Link>
    {loading ? <p role="status">불러오는 중…</p> : me ? <CandidateContent key={`${me.id}:${me.role}:${actionItemId}`} actionItemId={actionItemId} query={query} /> : <p role="alert">계정을 확인하지 못했어요. <Link href="/login">다시 로그인</Link></p>}
  </PhoneFrame>;
}
export function CandidateDetail(props: { actionItemId: string }) { return <Suspense><DetailBody {...props} /></Suspense>; }
