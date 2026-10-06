"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import {
  API_BASE,
  ApiRequestError,
  deleteDocument,
  fetchAiDocument,
  fetchAiDocumentExplanationStatus,
  fetchAiDocumentCitations,
  fetchAiDocumentFacts,
  fetchAiDocumentPage,
  fetchAiDocumentSections,
  type AiDocumentDetailResponse,
  type AiDocumentExplanationStatusResponse,
  type AiDocumentSectionsResponse,
  type AiDocumentCitationsResponse,
  type AiDocumentFactsResponse,
  type AiDocumentPageResponse
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
  // 문서 유형 코드를 사용자에게 익숙한 한글 라벨로 변환한다.
  return documentTypeLabels[type] ?? "의료문서";
}

function formatDate(value: string) {
  // 서버의 ISO 일시를 화면 표시용 한국어 날짜로 변환한다.
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function jobStatusLabel(status: string) {
  // AI 설명 작업 상태를 사용자 안내 문구로 변환한다.
  if (status === "SUCCEEDED") return "AI 설명 완료";
  if (status === "RUNNING") return "AI 설명 생성 중";
  if (status === "FAILED") return "AI 설명 생성 실패";
  if (status === "CANCELED") return "AI 설명 취소됨";
  return "AI 설명 대기 중";
}

const sectionTypeLabels: Record<string, string> = {
  LAB_RESULT: "진단 정보",
  MEDICATION: "복약 안내",
  CAUTION: "주의사항",
  FOLLOW_UP: "추적 관리",
  TEST_SCHEDULE: "검사 일정"
};

const sectionTypeDescriptions: Record<string, string> = {
  LAB_RESULT: "소견서에 적힌 진단과 주요 상태를 확인하세요.",
  CAUTION: "지금 확인하거나 다음 진료에서 상담할 내용을 모았어요.",
  MEDICATION: "복용 중인 약과 복약 관련 안내입니다.",
  FOLLOW_UP: "다음 진료 전까지 추적해서 볼 내용입니다.",
  TEST_SCHEDULE: "예정된 검사와 일정을 확인하세요."
};

function sectionTypeLabel(type: string) {
  // 설명 섹션 유형을 화면용 한글 라벨로 변환한다.
  return sectionTypeLabels[type] ?? "건강 안내";
}

function sectionTypeDescription(type: string) {
  // 설명 섹션의 목적을 짧은 안내 문구로 제공한다.
  return sectionTypeDescriptions[type] ?? "이 문서에서 확인할 건강 안내입니다.";
}

export default function AiDocumentDetailPage() {
  const { me, loading: loadingMe } = useMe();
  const router = useRouter();
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
  const [citations, setCitations] = useState<AiDocumentCitationsResponse | null>(null);
  const [facts, setFacts] = useState<AiDocumentFactsResponse | null>(null);
  const [openedPage, setOpenedPage] = useState<AiDocumentPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [citationError, setCitationError] = useState("");
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);

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

      const [nextDetail, nextSections, nextCitations, nextFacts] = await Promise.all([
        fetchAiDocument(documentId),
        fetchAiDocumentSections(documentId),
        fetchAiDocumentCitations(documentId),
        fetchAiDocumentFacts(documentId)
      ]);
      if (cancelled) {
        return;
      }
      setDetail(nextDetail);
      setSections(nextSections);
      setCitations(nextCitations);
      setFacts(nextFacts);
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
    return (
      <PhoneFrame tab="documents">
        <p className="page-sub">문서를 불러오는 중…</p>
      </PhoneFrame>
    );
  }

  async function onDelete() {
    // 문서 삭제를 확인하고 성공하면 문서함으로 돌아간다.
    const ok = window.confirm(
      "이 문서를 삭제할까요?\n삭제한 문서는 문서함에서 사라지고, " +
        "이 문서에서 만들어진 확인 전 할 일도 함께 취소됩니다."
    );
    if (!ok) {
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteDocument(documentId);
      router.replace(documentsHref);
    } catch (caught) {
      setDeleting(false);
      if (caught instanceof ApiRequestError && caught.status === 401) {
        router.replace("/login");
        return;
      }
      if (caught instanceof ApiRequestError && caught.status === 404) {
        setDeleteError("문서를 찾을 수 없거나 삭제 권한이 없습니다.");
      } else if (caught instanceof ApiRequestError && caught.status === 409) {
        setDeleteError("이미 삭제된 문서입니다.");
      } else {
        setDeleteError("문서를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  }

  async function openCitationPage(pageNo: number | null, anchorId?: string | null) {
    // 인용된 원문 페이지의 서명 URL을 받아 새 탭으로 연다.
    if (!pageNo) {
      setCitationError("페이지 정보가 없는 원문 근거입니다.");
      return;
    }
    try {
      const page = await fetchAiDocumentPage(documentId, pageNo, anchorId);
      setOpenedPage(page);
    } catch {
      setCitationError("원문 페이지를 열지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <PhoneFrame tab="documents" chatLocked={me.role === "CAREGIVER"} userName={me.name}>
      <Link href={documentsHref} className="document-back">
        ← 문서함
      </Link>
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
              <small className="document-evidence-notice">
                원문 근거를 바탕으로 의료 내용을 이해하기 쉽게 풀어쓴 설명입니다.
              </small>
              <p>{detail.content}</p>
            </section>
          ) : null}

          <div className="document-sections-heading">
            <div>
              <h2>이 문서에서 확인한 내용</h2>
              <p>소견서의 핵심 내용을 읽기 쉽게 정리했어요.</p>
            </div>
            <span>{detail.sectionCount}개 항목</span>
          </div>
          {sections.sections.map((section) => (
            <section key={section.sectionId} className="card document-section">
              <div className="document-section-header">
                <span className="tag">{sectionTypeLabel(section.sectionType)}</span>
                <h2>{section.title}</h2>
                <p className="document-section-description">
                  {sectionTypeDescription(section.sectionType)}
                </p>
              </div>
              {section.items.map((item) => (
                <div key={item.sentenceId} className="document-item document-item-evidence">
                  <strong>{item.label}</strong>
                  <span>{item.value ?? "값 없음"}{item.unit ? ` ${item.unit}` : ""}</span>
                  {item.hasSource && citations
                    ? (() => {
                        const matchedCitations = citations.citations.filter((entry) => {
                          if (item.sentenceId && entry.sentenceId === item.sentenceId) {
                            return true;
                          }
                          return Boolean(
                            item.sourceItemId &&
                              entry.sourceItemId === item.sourceItemId
                          );
                        });
                        if (matchedCitations.length === 0) {
                          return <small>📎 원문 위치를 확인할 수 없습니다.</small>;
                        }
                        return (
                          <div className="evidence-toggle">
                            {matchedCitations.map((citation) => {
                              const expanded = expandedCitationId === citation.citationId;
                              return <div key={citation.citationId} className="evidence-citation">
                              <button
                                className="evidence-toggle-button"
                                type="button"
                                aria-expanded={expanded}
                                onClick={() => {
                                  setCitationError("");
                                  setExpandedCitationId(expanded ? null : citation.citationId);
                                }}
                              >
                                {expanded ? "⌃ 원문 근거 접기" : "⌄ 원문 근거 보기"}
                              </button>
                              {expanded ? <div className="evidence-detail">
                                <p>{citation.sourceText ?? "원문 텍스트가 없습니다."}</p>
                                <small>{citation.pageNo ? `${citation.pageNo}페이지` : "페이지 정보 없음"}</small>
                                {citation.pageNo ? <button className="evidence-page-button" type="button" onClick={() => openCitationPage(citation.pageNo, citation.anchorId)}>원문 페이지 열기</button> : null}
                              </div> : null}
                              </div>;
                            })}
                          </div>
                        );
                      })()
                    : null}
                </div>
              ))}
            </section>
          ))}

          {citationError ? <p className="msg error">{citationError}</p> : null}

          {openedPage ? (
            <section className="card evidence-page-preview">
              <button className="evidence-page-close" type="button" onClick={() => setOpenedPage(null)}>닫기</button>
              {openedPage.renderedPage ? <div className="evidence-page-image-wrap">
                <img src={openedPage.pageUrl} alt={`${openedPage.pageNo}페이지 원문`} />
                {openedPage.sourceBox && openedPage.pageWidthPx && openedPage.pageHeightPx ? <span className="evidence-source-highlight" style={{ left: `${openedPage.sourceBox.x / openedPage.pageWidthPx * 100}%`, top: `${openedPage.sourceBox.y / openedPage.pageHeightPx * 100}%`, width: `${openedPage.sourceBox.width / openedPage.pageWidthPx * 100}%`, height: `${openedPage.sourceBox.height / openedPage.pageHeightPx * 100}%` }} /> : null}
              </div> : <iframe className="evidence-page-pdf" title={`${openedPage.pageNo}페이지 원문`} src={`${openedPage.pageUrl}#page=${openedPage.pageNo}`} />}
            </section>
          ) : null}

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

      {!error && status ? (
        <>
          {deleteError ? <p className="msg error">{deleteError}</p> : null}
          <button
            className="btn-out"
            type="button"
            style={{ marginTop: 12 }}
            disabled={deleting}
            onClick={onDelete}
          >
            {deleting ? "삭제 중…" : "문서 삭제"}
          </button>
        </>
      ) : null}
    </PhoneFrame>
  );
}
