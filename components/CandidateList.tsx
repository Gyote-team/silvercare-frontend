"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiRequestError } from "@/lib/api";
import { actionDate, actionError, actionQuery, approvalLabels, fetchActionItems, typeLabels, type ApprovalStatus, type ActionItemPage } from "@/lib/actionItems";

export function CandidateList({ patientId, status }: { patientId?: string; status?: ApprovalStatus }) {
  const [page, setPage] = useState<ActionItemPage>({ items: [], nextCursor: null });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState<string>();
  const [restart, setRestart] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError("");
    fetchActionItems(patientId, status, cursor, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setPage(previous => ({ items: cursor ? [...previous.items, ...result.items.filter(item => !previous.items.some(old => old.actionItemId === item.actionItemId))] : result.items, nextCursor: result.nextCursor }));
    }).catch(caught => {
      if (controller.signal.aborted) return;
      const clear = !cursor || (caught instanceof ApiRequestError && [400, 401, 403, 404].includes(caught.status));
      setError(actionError(caught)); setRestart(clear);
      if (clear) setPage({ items: [], nextCursor: null });
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [patientId, status, cursor, attempt]);
  const query = actionQuery(patientId, status);
  return <section aria-label="할 일 후보 목록" aria-busy={busy}>
    {error && <div className="candidate-card" role="alert"><p>{error}</p><button className="candidate-button" onClick={() => { if (restart) setCursor(undefined); setAttempt(value => value + 1); }}>{restart ? "다시 불러오기" : "다음 후보 다시 불러오기"}</button><Link href="/login">로그인으로 이동</Link></div>}
    {!busy && !error && !page.items.length && <div className="candidate-card candidate-empty"><span aria-hidden="true">✓</span><h2>아직 해당하는 후보가 없어요</h2><p>문서에서 생성된 할 일 후보가 있으면 이곳에서 확인할 수 있어요.</p></div>}
    <ul className="candidate-list">{page.items.map(item => <li key={item.actionItemId}><Link className={`candidate-card candidate-link${item.approvalStatus === "CANCELED" ? " is-canceled" : ""}`} href={`/action-items/${encodeURIComponent(item.actionItemId)}${query}`}>
      <div className="candidate-tags"><span className={`candidate-status ${item.approvalStatus.toLowerCase()}`}>{approvalLabels[item.approvalStatus]}</span><span>{typeLabels[item.type]}</span></div>
      <h2>{item.title}<span aria-hidden="true">›</span></h2>
      {item.description && <p className="candidate-preview">{item.description}</p>}
      <p className="candidate-meta">{item.estimatedAt ? `예상 일시 · ${actionDate(item.estimatedAt)}` : "예상 일시 미정"}</p>
      <p className="candidate-source-name">{item.sourceDocumentDeleted ? "삭제된 원본 문서" : item.documentName ?? "출처 문서"}</p>
    </Link></li>)}</ul>
    {busy && <p role="status">후보를 불러오는 중…</p>}
    {!busy && !error && page.nextCursor && <button className="candidate-button" onClick={() => setCursor(page.nextCursor!)}>후보 더 보기</button>}
  </section>;
}
