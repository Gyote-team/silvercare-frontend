"use client";
import Link from "next/link";
import { useEffect, useState, use } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { fetchAiResultDocument, type AiResultDocument } from "@/lib/api";

export default function AiResultDocumentPage({ params }: { params: Promise<{ resultDocumentId: string }> }) {
  const { resultDocumentId } = use(params);
  const [document, setDocument] = useState<AiResultDocument | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetchAiResultDocument(resultDocumentId).then(setDocument).catch(() => setError("문서를 불러오지 못했습니다.")); }, [resultDocumentId]);
  return <PhoneFrame tab="documents"><div className="ai-result-page-head"><Link href="/documents" className="ai-result-back">‹ 문서함</Link><span className="ai-result-lock">🔒 나만 보기</span></div>{error ? <p className="msg error">{error}</p> : null}{!document && !error ? <p className="page-sub">문서를 불러오는 중…</p> : null}{document ? <article className="ai-result-detail"><header><div className="ai-result-kicker"><span className="ai-result-spark">✦</span><span>AI 결과 문서</span><span className="ai-result-status">{document.saveStatus === "SAVED" ? "저장됨" : "초안"}</span></div><h1>{document.title || "AI 결과 문서"}</h1><p>{document.savedAt ? new Date(document.savedAt).toLocaleString("ko-KR") : "저장 전 초안"} · {document.questionType}</p></header><div className="ai-result-content"><SafeMarkdown>{document.content || "표시할 내용이 없습니다."}</SafeMarkdown></div><details className="ai-result-sources"><summary><span>원문 근거</span><small>답변에 사용된 출처 확인</small></summary><pre>{document.citationJson || "[]"}</pre></details></article> : null}</PhoneFrame>;
}
