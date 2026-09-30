"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import {
  API_BASE,
  ApiRequestError,
  fetchAiDocument,
  fetchAiDocumentExplanationStatus,
  fetchAiDocumentSections,
  type AiDocumentDetailResponse,
  type AiDocumentExplanationStatusResponse,
  type AiDocumentSectionsResponse
} from "@/lib/api";
import { useMe } from "@/lib/useMe";

const documentTypeLabels: Record<string, string> = {
  LAB_RESULT: "검사결과지",
  PRESCRIPTION: "처방전·복약안내",
  DIAGNOSIS: "진단서",
  DISCHARGE_GUIDE: "퇴원·진료 안내문",
  UNKNOWN: "의료문서"
};

function documentTypeLabel(type: string) {
  return documentTypeLabels[type] ?? "의료문서";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function jobStatusLabel(status: string) {
  if (status === "SUCCEEDED") return "AI 설명 완료";
  if (status === "RUNNING") return "AI 설명 생성 중";
  if (status === "FAILED") return "AI 설명 생성 실패";
  if (status === "CANCELED") return "AI 설명 취소됨";
  return "AI 설명 대기 중";
}

export default function AiDocumentDetailPage() {
  const { me, loading: loadingMe } = useMe();
  const params = useParams<{ documentId: string }>();
  const searchParams = useSearchParams();
  const documentId = params.documentId;
  const patientId = searchParams.get("patientId");
  const documentsHref = patientId
    ? `/documents?patientId=${encodeURIComponent(patientId)}`
    : "/documents";
  const [detail, setDetail] = useState<AiDocumentDetailResponse | null>(null);
  const [sections, setSections] = useState<AiDocumentSectionsResponse | null>(null);
  const [status, setStatus] = useState<AiDocumentExplanationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me || !documentId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    async function load() {
      const nextStatus = await fetchAiDocumentExplanationStatus(documentId);
      if (cancelled) {
        return;
      }
      setStatus(nextStatus);

      if (nextStatus.jobStatus !== "SUCCEEDED") {
        setLoading(false);
        return;
      }

      const [nextDetail, nextSections] = await Promise.all([
        fetchAiDocument(documentId),
        fetchAiDocumentSections(documentId)
      ]);
      if (cancelled) {
        return;
      }
      setDetail(nextDetail);
      setSections(nextSections);
      setLoading(false);
    }

    load().catch((reason: unknown) => {
      if (cancelled) {
        return;
      }
      if (reason instanceof ApiRequestError && reason.status === 403) {
        setError("이 의료문서를 조회할 권한이 없습니다.");
      } else if (reason instanceof ApiRequestError && reason.status === 404) {
        setError("의료문서를 찾을 수 없습니다.");
      } else {
        setError("의료문서를 불러오지 못했습니다.");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [documentId, me]);

  if (loadingMe || !me || loading) {
    return <PhoneFrame tab="documents"><p className="page-sub">문서를 불러오는 중…</p></PhoneFrame>;
  }

  return (
    <PhoneFrame tab="documents" chatLocked={me.role === "CAREGIVER"} userName={me.name}>
      <Link href={documentsHref} className="document-back">← 문서함</Link>
      {error ? <p className="msg error">{error}</p> : null}

      {status && status.jobStatus !== "SUCCEEDED" ? (
        <section className="card document-status-card">
          <span className="tag orange">{jobStatusLabel(status.jobStatus)}</span>
          <h3>AI 설명을 준비하고 있어요.</h3>
          {status.currentStep ? <p>현재 단계: {status.currentStep}</p> : null}
          {status.progress !== null ? <p>진행률: {status.progress}%</p> : null}
          {status.failedStep ? <p>실패 단계: {status.failedStep}</p> : null}
          {status.errorCode ? <p>오류 코드: {status.errorCode}</p> : null}
          {status.retryable ? <p>잠시 후 다시 확인해 주세요.</p> : null}
        </section>
      ) : null}

      {detail && sections ? (
        <>
          <section className="card document-detail-header">
            <span className="tag">{documentTypeLabel(detail.documentType)}</span>
            <h1>{detail.title ?? detail.documentName}</h1>
            <p>{detail.documentName}</p>
            <p>{formatDate(detail.createdAt)}</p>
            <span className="tag orange">{jobStatusLabel(detail.jobStatus)}</span>
          </section>

          {detail.content ? (
            <section className="card document-detail-content">
              <h2>AI 설명</h2>
              <p>{detail.content}</p>
            </section>
          ) : null}

          <div className="section-label">
            <span>설명 섹션</span>
            <span>{detail.sectionCount}개</span>
          </div>
          {sections.sections.map((section) => (
            <section key={section.sectionId} className="card document-section">
              <span className="tag">{section.sectionType}</span>
              <h2>{section.title}</h2>
              {section.items.map((item) => (
                <div key={item.sentenceId} className="document-item">
                  <strong>{item.label}</strong>
                  <span>{item.value ?? "값 없음"}{item.unit ? ` ${item.unit}` : ""}</span>
                  {item.hasSource ? <small>📎 원문 근거 연결됨</small> : null}
                </div>
              ))}
            </section>
          ))}

          {status?.originalDocumentUrl ? (
            <a
              className="btn-secondary"
              href={`${API_BASE}${status.originalDocumentUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              원문 문서 보기
            </a>
          ) : null}
        </>
      ) : null}
    </PhoneFrame>
  );
}
