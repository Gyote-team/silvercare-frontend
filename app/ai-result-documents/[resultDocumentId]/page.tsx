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
  return <PhoneFrame tab="documents"><Link href="/documents">‹ 문서함</Link>{error ? <p className="msg error">{error}</p> : null}{!document && !error ? <p>불러오는 중…</p> : null}{document ? <article className="card ai-result-detail"><span className="tag">{document.questionType}</span><h1>{document.title || "AI 결과 문서"}</h1><small>{document.savedAt ? new Date(document.savedAt).toLocaleString("ko-KR") : "저장 전 초안"}</small><SafeMarkdown>{document.content || "표시할 내용이 없습니다."}</SafeMarkdown><details><summary>원문 근거</summary><pre>{document.citationJson || "[]"}</pre></details></article> : null}</PhoneFrame>;
}
