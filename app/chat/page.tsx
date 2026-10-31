"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PhoneFrame } from "@/components/PhoneFrame";
import {
  ApiRequestError,
  askAiChat,
  createAiChatSession,
  fetchAiChatMessages,
  fetchAiChatSessions,
  fetchAiResultDocument,
  saveAiResultDocument,
  fetchMedicalDocuments,
  api,
  type CareRelation,
  type AiResultEvidence,
  type AiChatMessage,
  type AiChatSession,
  type AiQuestionType,
  type MedicalDocumentListItem
} from "@/lib/api";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { useMe } from "@/lib/useMe";
import { citedEvidence } from "@/lib/aiResultEvidence";

const guides: Array<{ label: string; question: string; type: AiQuestionType }> = [
  {
    label: "쉽게 설명해 주세요",
    question: "선택한 문서를 어려운 말 없이 자세하게 설명해 주세요. 수치와 용어도 함께 풀어서 알려 주세요.",
    type: "DOCUMENT_EASY_EXPLANATION"
  },
  {
    label: "이전과 비교해 주세요",
    question: "선택한 문서들을 이전 결과와 비교해서 무엇이 얼마나 달라졌는지 자세히 알려 주세요.",
    type: "LAB_RESULT_COMPARISON"
  },
  {
    label: "검사 수치가 궁금해요",
    question: "선택한 문서에 적힌 검사 수치와 기준 범위를 쉬운 말로 설명해 주세요.",
    type: "DOCUMENT_EASY_EXPLANATION"
  }
];

function dateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function sessionDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function questionTitle(value: string) {
  const first = value.trim().replace(/\s+/g, " ").split(/[.!?。]\s/)[0];
  return first.length > 38 ? `${first.slice(0, 37).trimEnd()}…` : first;
}

function failureMessage(reason: unknown) {
  if (reason instanceof ApiRequestError) {
    if (reason.status === 403) return `열람 권한이 없어 답변을 만들지 못했어요: ${reason.error}`;
    return `답변 생성 요청이 실패했어요 (HTTP ${reason.status}): ${reason.error}`;
  }
  return reason instanceof Error ? `서버 연결에 실패했어요: ${reason.message}` : "알 수 없는 오류로 답변을 만들지 못했어요.";
}

function ChatContent() {
  const { me, loading: meLoading } = useMe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams.get("patientId") ?? undefined;
  const requestedSessionId = searchParams.get("sessionId");
  const [relations, setRelations] = useState<CareRelation[]>([]);
  const [relationsLoaded, setRelationsLoaded] = useState(false);
  const [checkingRelations, setCheckingRelations] = useState(false);
  const [relationsFailed, setRelationsFailed] = useState(false);
  const [deniedPatientId, setDeniedPatientId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [session, setSession] = useState<AiChatSession | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [documents, setDocuments] = useState<MedicalDocumentListItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState("");
  const newlyCreatedSession = useRef<string | null>(null);
  const selectionVersion = useRef(0);
  const [evidence, setEvidence] = useState<Record<string, AiResultEvidence[]>>({});
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);
  const [savedResults, setSavedResults] = useState<Record<string, boolean>>({});

  const selectedCount = selectedDocumentIds.length;
  const hasDocuments = documents.length > 0;
  const caregiverAccessDenied = me?.role === "CAREGIVER" && !!patientId && (
    deniedPatientId === patientId ||
    (relationsLoaded && !relationsFailed && !relations.some((row) => row.patientId === patientId))
  );
  const patientLabel = me?.role === "CAREGIVER"
    ? relations.find((row) => row.patientId === patientId)?.counterpartName ?? "선택한 환자"
    : "나의 의료기록";

  useEffect(() => {
    if (me?.role !== "CAREGIVER") return;
    let active = true;
    let latestRequest = 0;
    const refreshRelations = () => {
      const request = ++latestRequest;
      setCheckingRelations(true);
      api<CareRelation[]>("/api/care-relations")
        .then((rows) => {
          if (!active || request !== latestRequest) return;
          setRelations(rows.filter((row) => row.status === "ACTIVE"));
          setRelationsFailed(false);
          setRelationsLoaded(true);
          setCheckingRelations(false);
        })
        .catch((reason) => {
          if (!active || request !== latestRequest) return;
          setRelationsFailed(true);
          setRelationsLoaded(true);
          setCheckingRelations(false);
          setError(failureMessage(reason));
        });
    };
    refreshRelations();
    window.addEventListener("focus", refreshRelations);
    return () => { active = false; window.removeEventListener("focus", refreshRelations); };
  }, [me?.id, me?.role]);

  useEffect(() => {
    selectionVersion.current += 1;
    setSessions([]);
    setSession(null);
    setMessages([]);
    setDocuments([]);
    setSelectedDocumentIds([]);
    if (!me || (me.role === "CAREGIVER" && (!patientId || !relationsLoaded || relationsFailed || caregiverAccessDenied))) return;
    let active = true;
    Promise.all([
      fetchAiChatSessions(patientId),
      fetchMedicalDocuments(patientId)
    ])
      .then(([nextSessions, nextDocuments]) => {
        if (!active) return;
        setSessions(nextSessions);
        const requestedSession = requestedSessionId
          ? nextSessions.find((item) => item.sessionId === requestedSessionId) ?? null
          : null;
        setSession(requestedSession);
        if (!requestedSession) setMessages([]);
        const availableDocuments = nextDocuments.items.filter((document) => document.documentStatus !== "DELETED");
        setDocuments(availableDocuments);
        // 기본적으로 분석 가능한 문서를 모두 선택해 질문 입력 즉시 제출할 수 있게 한다.
        // 사용자는 문서 체크박스에서 답변 범위를 좁힐 수 있다.
        setSelectedDocumentIds(availableDocuments.map((document) => document.documentId));
      })
      .catch((reason) => {
        if (!active) return;
        if (reason instanceof ApiRequestError && reason.status === 403 && patientId) {
          setDeniedPatientId(patientId);
        }
        setError(failureMessage(reason));
      });
    return () => { active = false; };
  }, [me, patientId, requestedSessionId, relationsLoaded, relationsFailed, caregiverAccessDenied]);

  useEffect(() => {
    if (!session) {
      setMessages([]);
      return;
    }
    if (newlyCreatedSession.current === session.sessionId) {
      newlyCreatedSession.current = null;
      return;
    }
    let active = true;
    fetchAiChatMessages(session.sessionId)
      .then((items) => { if (active) setMessages(items); })
      .catch((reason) => {
        if (!active) return;
        if (reason instanceof ApiRequestError && reason.status === 403 && me?.role === "CAREGIVER") {
          setDeniedPatientId(session.patientId);
        }
        setError(failureMessage(reason));
      });
    return () => { active = false; };
  }, [session, me?.role]);

  const sourceSummary = useMemo(() => {
    if (!selectedCount) return "문서를 선택하면 원문 근거를 함께 보여 드려요.";
    return `${selectedCount}개 문서의 분석 완료된 원문 근거만 사용합니다.`;
  }, [selectedCount]);

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((ids) => ids.includes(documentId)
      ? ids.filter((id) => id !== documentId)
      : [...ids, documentId]);
  }

  function chatRoomHref(sessionId: string) {
    const params = new URLSearchParams();
    if (patientId) params.set("patientId", patientId);
    params.set("sessionId", sessionId);
    return `/chat?${params.toString()}`;
  }

  function sourceDocumentHref(documentId: string) {
    const params = new URLSearchParams();
    if (patientId) params.set("patientId", patientId);
    if (session) params.set("returnTo", chatRoomHref(session.sessionId));
    const query = params.toString();
    return `/documents/${encodeURIComponent(documentId)}${query ? `?${query}` : ""}`;
  }

  function selectSession(nextSession: AiChatSession | null) {
    selectionVersion.current += 1;
    setSession(nextSession);
  }

  async function ensureSession(firstQuestion: string, requestVersion: number) {
    if (session) return session;
    const created = await createAiChatSession(patientId, questionTitle(firstQuestion));
    if (selectionVersion.current !== requestVersion) return null;
    setSessions((items) => [created, ...items]);
    newlyCreatedSession.current = created.sessionId;
    setSession(created);
    return created;
  }

  async function startNewChat() {
    if (creatingSession || (me?.role === "CAREGIVER" && !patientId)) return;
    setCreatingSession(true);
    setError("");
    const requestVersion = selectionVersion.current;
    try {
      const created = await createAiChatSession(patientId, "새 채팅");
      if (selectionVersion.current !== requestVersion) return;
      newlyCreatedSession.current = created.sessionId;
      setSessions((items) => [created, ...items]);
      selectSession(created);
      setMessages([]);
      setQuestion("");
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.status === 403 && patientId) {
        setDeniedPatientId(patientId);
      }
      setError(failureMessage(reason));
    } finally {
      setCreatingSession(false);
    }
  }

  async function submit(event?: FormEvent, preset?: typeof guides[number]) {
    event?.preventDefault();
    const nextQuestion = preset?.question ?? question.trim();
    const nextType = preset?.type;
    if (!nextQuestion || !selectedDocumentIds.length || busy || (me?.role === "CAREGIVER" && !patientId)) return;
    setBusy(true);
    setError("");
    const requestVersion = selectionVersion.current;
    const pendingId = `pending-${Date.now()}`;
    try {
      const target = await ensureSession(nextQuestion, requestVersion);
      if (!target || selectionVersion.current !== requestVersion) return;
      const optimisticMessage: AiChatMessage = {
        messageId: pendingId,
        role: "USER",
        content: nextQuestion,
        createdAt: new Date().toISOString()
      };
      setMessages((current) => [...current, optimisticMessage]);
      const nextMessages = await askAiChat(target.sessionId, nextQuestion, nextType, selectedDocumentIds);
      if (selectionVersion.current !== requestVersion) return;
      setMessages(nextMessages);
      if (target.title === "새 채팅") {
        const titledSession = { ...target, title: questionTitle(nextQuestion) };
        setSession(titledSession);
        setSessions((items) => items.map((item) => item.sessionId === target.sessionId ? titledSession : item));
      }
      setQuestion("");
    } catch (reason) {
      if (selectionVersion.current !== requestVersion) return;
      if (reason instanceof ApiRequestError && reason.status === 403 && patientId) {
        setDeniedPatientId(patientId);
      }
      setMessages((current) => current.filter((message) => message.messageId !== pendingId));
      setError(failureMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function showEvidence(message: AiChatMessage) {
    if (!message.resultDocumentId) return;
    if (openEvidence === message.messageId) {
      setOpenEvidence(null);
      return;
    }
    setOpenEvidence(message.messageId);
    if (evidence[message.messageId]) return;
    try {
      const result = await fetchAiResultDocument(message.resultDocumentId);
      setEvidence((current) => ({
        ...current,
        [message.messageId]: citedEvidence(result.citationJson)
      }));
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.status === 403 && patientId) {
        setDeniedPatientId(patientId);
      }
      setError(failureMessage(reason));
    }
  }

  async function saveResult(message: AiChatMessage) {
    if (!message.resultDocumentId) return;
    try {
      await saveAiResultDocument(message.resultDocumentId);
      setSavedResults((current) => ({ ...current, [message.resultDocumentId!]: true }));
    } catch (reason) { setError(failureMessage(reason)); }
  }

  if (meLoading || !me) return <PhoneFrame tab="chat"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  if (me.role === "CAREGIVER" && patientId && (!relationsLoaded || checkingRelations)) {
    return <PhoneFrame tab="chat"><p className="page-sub">연결 상태를 확인하고 있어요…</p></PhoneFrame>;
  }
  if (me.role === "CAREGIVER" && patientId && relationsFailed) {
    return <PhoneFrame tab="chat"><p className="chat-error" role="alert">연결 상태를 확인하지 못했어요. 다시 접속해 주세요.</p><Link href="/chat">가족 선택으로 돌아가기</Link></PhoneFrame>;
  }
  if (caregiverAccessDenied) {
    return <PhoneFrame tab="chat"><p className="chat-error" role="alert">현재 이 환자의 채팅을 볼 권한이 없어요.</p><Link href="/chat">가족 선택으로 돌아가기</Link></PhoneFrame>;
  }

  return (
    <PhoneFrame tab="chat" userName={me.name} scrollClassName={`chat-screen${session ? " chat-screen-active" : ""}`}>
      {!session && (me.role !== "CAREGIVER" || !patientId) ? <header className="chat-header chat-welcome">
        <div>
          <span className="eyebrow">SILVERCARE AI</span>
          <h1>의료기록을<br />쉽게 물어보세요</h1>
          <p>복잡한 검사 결과도 원문 근거와 함께<br />차근차근 설명해 드려요.</p>
        </div>
        <span className="chat-shield" aria-label="대화는 작성자만 볼 수 있음"><b>✓</b><small>보호됨</small></span>
      </header> : null}

      {!session && (me.role !== "CAREGIVER" || !patientId) ? <section className="chat-privacy-notice">
        <span className="privacy-icon">🔒</span><span><strong>안심하고 질문하세요</strong><small>채팅 내용은 작성자만 볼 수 있어요.</small></span>
      </section> : null}

      {me.role === "CAREGIVER" && !session && !patientId ? (
        <section className="chat-target-card">
          <div className="chat-section-heading"><div><span>01</span><strong>누구의 기록을 볼까요?</strong></div><small>연결된 가족</small></div>
          <div className="chat-target-list">
            {relations.map((row) => <button key={row.id} type="button" className={patientId === row.patientId ? "active" : ""} onClick={() => router.push(`/chat?patientId=${encodeURIComponent(row.patientId)}`)}><span className="target-avatar">{row.counterpartName.slice(0, 1)}</span><span><strong>{row.counterpartName}</strong><small>의료기록으로 질문하기</small></span><i className="chat-chevron" /></button>)}
          </div>
          {!relations.length ? <div className="chat-empty-room"><span>👥</span><strong>연결된 가족이 없어요</strong><p>홈에서 개인과 먼저 연결해 주세요.</p></div> : null}
        </section>
      ) : null}

      {me.role === "CAREGIVER" && !session && patientId ? <section className="chat-person-context"><button type="button" onClick={() => router.push("/chat")}><i className="back-chevron" /> 다른 가족</button><div><span className="target-avatar">{patientLabel.slice(0, 1)}</span><span><small>선택한 가족</small><strong>{patientLabel}</strong></span></div><span className="context-safe">✓ 연결됨</span></section> : null}

      {(me.role !== "CAREGIVER" || patientId) && !session ? <section className="chat-room-picker">
        <div className="chat-room-heading"><div><span className="eyebrow">CONVERSATIONS</span><h2>{patientLabel}님과의 채팅</h2><p>이전 대화를 이어가거나 새 질문을 시작하세요.</p></div><button type="button" className="chat-new-button" onClick={startNewChat} disabled={creatingSession}><span>＋</span> {creatingSession ? "만드는 중" : "새 채팅"}</button></div>
        {sessions.length ? <div className="chat-session-list chat-session-grid">
          {sessions.map((item) => <button key={item.sessionId} type="button" className="chat-session-card" onClick={() => { selectSession(item); setError(""); }}><span className="chat-session-icon">✦</span><span><strong>{item.title || "제목 없는 채팅"}</strong><small><i />{sessionDate(item.createdAt)}</small></span><i className="chat-chevron" /></button>)}
        </div> : <div className="chat-empty-room"><span>🫧</span><strong>아직 채팅방이 없어요</strong><p>새 채팅을 눌러 첫 질문을 시작해 보세요.</p></div>}
      </section> : null}

      {(me.role !== "CAREGIVER" || patientId) && session ? <div className="chat-sticky-tools">
        <div className="chat-active-room"><button type="button" onClick={() => { selectSession(null); setMessages([]); setQuestion(""); }}>‹ 목록</button><strong>{session.title || "새 채팅"}</strong></div>
        <details className="chat-doc-dock">
          <summary className="chat-doc-toggle"><span><i className="doc-stack">▤</i><strong>답변에 사용할 문서</strong><small>{selectedCount}/{documents.length}</small></span><span className="doc-toggle-action">문서 선택 <i className="toggle-chevron" /></span></summary>
          <div className="chat-doc-panel"><div className="chat-doc-panel-head"><strong>원하는 문서만 선택하세요</strong><small>{sourceSummary}</small></div>
          {hasDocuments ? (
            <div className="chat-document-picker">
              {documents.map((document) => <div key={document.documentId} className={`chat-document-option ${selectedDocumentIds.includes(document.documentId) ? "selected" : ""}`}><label><input type="checkbox" checked={selectedDocumentIds.includes(document.documentId)} onChange={() => toggleDocument(document.documentId)} /><span className="doc-check">✓</span><span><strong>{document.documentName}</strong><small>{document.visitedOn ?? "방문일 미상"}</small></span></label><Link href={sourceDocumentHref(document.documentId)}>보기</Link></div>)}
            </div>
          ) : <p className="chat-empty">이 대상의 의료문서가 없습니다. 분석이 완료된 문서를 먼저 올려 주세요.</p>}
          </div>
        </details>
      </div> : null}

      {session && !messages.length && !busy ? (
        <section className="chat-guide">
          <div className="chat-section-title"><strong>이렇게 질문해 보세요</strong></div>
          <div className="chat-guide-list">
            {guides.map((guide) => <button key={guide.label} type="button" onClick={() => submit(undefined, guide)} disabled={!selectedCount || busy}>{guide.label}<i className="chat-chevron" /></button>)}
          </div>
        </section>
      ) : session ? (
        <section className="chat-thread" aria-live="polite">
          {messages.map((message) => (
            <article key={message.messageId} className={`chat-bubble ${message.role === "USER" ? "mine" : "assistant"}`}>
              {message.role === "ASSISTANT" ? (
                <div className="chat-answer-heading">
                  <span className="chat-ai-mark" aria-hidden="true">✦</span>
                  <span><strong>SilverCare AI</strong><small>선택한 의료문서의 근거를 바탕으로 답변했어요</small></span>
                </div>
              ) : <span className="chat-role">나</span>}
              {message.role === "ASSISTANT" ? <SafeMarkdown>{message.content}</SafeMarkdown> : <p>{message.content}</p>}
              <div className="chat-message-footer"><time>{dateTime(message.createdAt)}</time>{message.role === "ASSISTANT" ? <span>AI 답변</span> : null}</div>
              {message.role === "ASSISTANT" && message.resultDocumentId ? (
                <>
                  <div className="chat-answer-tools">
                    <button type="button" className="citation-link" onClick={() => showEvidence(message)}><span aria-hidden="true">⌁</span>{openEvidence === message.messageId ? "원문 근거 닫기" : "답변 근거 확인"}</button>
                    <span className="chat-answer-tools-note">답변은 진료를 대신하지 않아요</span>
                  </div>
                  <div className="result-save-cta"><span className="result-save-icon" aria-hidden="true">▣</span><span><strong>답변을 내 문서에 보관</strong><small>언제든 문서함에서 다시 확인할 수 있어요</small></span>{savedResults[message.resultDocumentId] ? <Link href={`/ai-result-documents/${message.resultDocumentId}`}>문서 보기</Link> : <button type="button" onClick={() => saveResult(message)}>문서로 저장</button>}</div>
                  {openEvidence === message.messageId ? <div className="chat-evidence-list">
                    {evidence[message.messageId]?.length ? evidence[message.messageId].map((source) => <div key={source.citationId} className="chat-evidence-item">
                      <div><span>원문 근거</span><small>{source.pageNo ? `${source.pageNo}쪽` : "페이지 정보 없음"}</small></div>
                      <strong>{source.label || "의료문서"}</strong>
                      <blockquote>{source.sourceText || [source.value, source.unit].filter(Boolean).join(" ") || "원문 텍스트가 없습니다."}</blockquote>
                      {source.documentId ? <Link href={sourceDocumentHref(source.documentId)}>문서에서 확인 <i className="chat-chevron" /></Link> : null}
                    </div>) : <p>이 답변에 연결된 원문 근거가 없습니다.</p>}
                  </div> : null}
                </>
              ) : null}
            </article>
          ))}
          {!busy && messages.some((message) => message.role === "ASSISTANT") ? <div className="chat-followup"><span className="followup-spark">✦</span><strong>이어서 물어보세요</strong><span>추천 질문을 누르거나 직접 질문을 입력해 주세요.</span><div>{guides.map((guide) => <button key={guide.label} type="button" onClick={() => submit(undefined, guide)} disabled={!selectedCount}>{guide.label}<i className="chat-chevron" /></button>)}</div></div> : null}
          {busy ? <div className="chat-thinking">원문 근거를 확인하며 답변을 만들고 있어요…</div> : null}
        </section>
      ) : null}

      {error ? <p className="chat-error" role="alert">오류 위치: {error}</p> : null}
      {(me.role !== "CAREGIVER" || patientId) && session ? <form className="chat-composer" onSubmit={submit}>
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="더 자세한 질문을 남겨 주세요…" rows={1} />
        <button type="submit" aria-label="질문 보내기" disabled={!question.trim() || !selectedCount || busy}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" /></svg>
        </button>
      </form> : null}
    </PhoneFrame>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="page-shell"><section className="chat-panel"><p className="chat-thinking">채팅을 준비하고 있어요...</p></section></main>}>
      <ChatContent />
    </Suspense>
  );
}
