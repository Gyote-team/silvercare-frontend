"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSavedAiResultDocuments, type AiResultDocument } from "@/lib/api";

export function AiResultDocumentsSection() {
  const [items, setItems] = useState<AiResultDocument[]>([]);
  useEffect(() => { fetchSavedAiResultDocuments().then(setItems).catch(() => setItems([])); }, []);
  return <section className="ai-result-documents">
    <div className="section-label"><span>AI 결과 문서</span><span>{items.length}건</span></div>
    {!items.length ? <div className="card document-empty"><strong>저장한 AI 답변이 없습니다.</strong><p>채팅 답변 아래 ‘문서로 저장’을 누르면 여기에 보관됩니다.</p></div> :
      <div className="document-list">{items.map((item) => <Link key={item.resultDocumentId} href={`/ai-result-documents/${item.resultDocumentId}`} className="document-list-item"><div className="document-list-main"><span className="tag">{item.questionType}</span><strong>{item.title || "AI 결과 문서"}</strong><span>{item.savedAt ? new Date(item.savedAt).toLocaleDateString("ko-KR") : ""}</span></div><span className="document-arrow">›</span></Link>)}</div>}
  </section>;
}
