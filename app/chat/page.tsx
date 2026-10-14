"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import {
  ApiRequestError,
  askAiChat,
  createAiChatSession,
  fetchAiChatMessages,
  fetchAiChatSessions,
  fetchMedicalDocuments,
  type AiChatMessage,
  type AiChatSession,
  type AiQuestionType,
  type MedicalDocumentListItem
} from "@/lib/api";
import { useMe } from "@/lib/useMe";

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

function ChatContent() {
  const { me, loading: meLoading } = useMe();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") ?? undefined;
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [session, setSession] = useState<AiChatSession | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [documents, setDocuments] = useState<MedicalDocumentListItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [questionType, setQuestionType] = useState<AiQuestionType>("DOCUMENT_EASY_EXPLANATION");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedCount = selectedDocumentIds.length;
  const hasDocuments = documents.length > 0;
  const patientLabel = me?.role === "CAREGIVER" ? "연결된 환자" : "나의 의료기록";

  useEffect(() => {
    if (!me) return;
    let active = true;
    Promise.all([
      fetchAiChatSessions(patientId),
      fetchMedicalDocuments(patientId)
    ])
      .then(([nextSessions, nextDocuments]) => {
        if (!active) return;
        setSessions(nextSessions);
        setSession(nextSessions[0] ?? null);
        setDocuments(nextDocuments.items.filter((document) => document.documentStatus !== "DELETED"));
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof ApiRequestError ? "채팅 정보를 불러오지 못했어요." : "서버와 연결하지 못했어요.");
      });
    return () => { active = false; };
  }, [me, patientId]);

  useEffect(() => {
    if (!session) {
      setMessages([]);
      return;
    }
    fetchAiChatMessages(session.sessionId)
      .then(setMessages)
      .catch(() => setError("대화 내용을 불러오지 못했어요."));
  }, [session]);

  const sourceSummary = useMemo(() => {
    if (!selectedCount) return "문서를 선택하면 원문 근거를 함께 보여 드려요.";
    return `${selectedCount}개 문서의 분석 완료된 원문 근거만 사용합니다.`;
  }, [selectedCount]);

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((ids) => ids.includes(documentId)
      ? ids.filter((id) => id !== documentId)
      : [...ids, documentId]);
  }

  async function ensureSession() {
    if (session) return session;
    const created = await createAiChatSession(patientId, "의료기록 질문");
    setSessions((items) => [created, ...items]);
    setSession(created);
    return created;
  }

  async function submit(event?: FormEvent, preset?: typeof guides[number]) {
    event?.preventDefault();
    const nextQuestion = preset?.question ?? question.trim();
    const nextType = preset?.type ?? questionType;
    if (!nextQuestion || !selectedDocumentIds.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const target = await ensureSession();
      const optimisticMessage: AiChatMessage = {
        messageId: `pending-${Date.now()}`,
        role: "USER",
        content: nextQuestion,
        createdAt: new Date().toISOString()
      };
      setMessages((current) => [...current, optimisticMessage]);
      const nextMessages = await askAiChat(target.sessionId, nextQuestion, nextType, selectedDocumentIds);
      setMessages(nextMessages);
      setQuestion("");
    } catch (reason) {
      setError(reason instanceof ApiRequestError ? "답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요." : "AI 서버 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (meLoading || !me) return <PhoneFrame tab="chat"><p className="page-sub">불러오는 중…</p></PhoneFrame>;

  return (
    <PhoneFrame tab="chat" userName={me.name} scrollClassName="chat-screen">
      <header className="chat-header">
        <div>
          <span className="eyebrow">근거 기반 AI 안내</span>
          <h1>의료기록에게 물어보세요</h1>
          <p>{patientLabel}을 바탕으로 원문 근거와 함께 답해요.</p>
        </div>
        <span className="chat-shield" aria-label="대화는 작성자만 볼 수 있음">🔒</span>
      </header>

      <section className="chat-privacy-notice">
        <strong>대화 내용은 나만 볼 수 있어요.</strong>
        <span>AI 결과 문서는 환자와 연결된 보호자가 함께 확인할 수 있어요.</span>
      </section>

      <section className="chat-source-card">
        <div className="chat-section-title"><strong>답변에 사용할 문서</strong><span>{selectedCount}개 선택</span></div>
        <p>{sourceSummary}</p>
        {hasDocuments ? (
          <div className="chat-document-picker">
            {documents.map((document) => (
              <label key={document.documentId} className="chat-document-option">
                <input type="checkbox" checked={selectedDocumentIds.includes(document.documentId)} onChange={() => toggleDocument(document.documentId)} />
                <span><strong>{document.documentName}</strong><small>{document.visitedOn ?? "방문일 미상"}</small></span>
              </label>
            ))}
          </div>
        ) : <p className="chat-empty">분석이 완료된 의료문서를 먼저 올려 주세요.</p>}
      </section>

      {!messages.length && !busy ? (
        <section className="chat-guide">
          <div className="chat-section-title"><strong>이렇게 질문해 보세요</strong></div>
          <div className="chat-guide-list">
            {guides.map((guide) => <button key={guide.label} type="button" onClick={() => submit(undefined, guide)} disabled={!selectedCount || busy}>{guide.label}<span>›</span></button>)}
          </div>
        </section>
      ) : (
        <section className="chat-thread" aria-live="polite">
          {messages.map((message) => (
            <article key={message.messageId} className={`chat-bubble ${message.role === "USER" ? "mine" : "assistant"}`}>
              <span className="chat-role">{message.role === "USER" ? "나" : "SilverCare AI"}</span>
              <p>{message.content}</p>
              <time>{dateTime(message.createdAt)}</time>
              {message.role === "ASSISTANT" ? <button type="button" className="citation-link">원문 근거 보기</button> : null}
            </article>
          ))}
          {busy ? <div className="chat-thinking">원문 근거를 확인하며 답변을 만들고 있어요…</div> : null}
        </section>
      )}

      {error ? <p className="chat-error" role="alert">오류 위치: {error}</p> : null}
      <form className="chat-composer" onSubmit={submit}>
        <select value={questionType} onChange={(event) => setQuestionType(event.target.value as AiQuestionType)} aria-label="질문 종류">
          <option value="DOCUMENT_EASY_EXPLANATION">쉬운 설명</option>
          <option value="LAB_RESULT_COMPARISON">이전 결과 비교</option>
        </select>
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="예: 헤모글로빈 수치가 이전보다 얼마나 달라졌어?" rows={2} />
        <button type="submit" disabled={!question.trim() || !selectedCount || busy}>↑</button>
      </form>
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
