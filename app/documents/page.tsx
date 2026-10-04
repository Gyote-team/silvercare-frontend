"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import {
  ApiRequestError,
  api,
  fetchAiDocuments,
  type AiDocumentListItem,
  type CareRelation
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

function documentStatusLabel(document: AiDocumentListItem) {
  if (document.jobStatus === "SUCCEEDED") {
    return document.resultStatus === "COMPLETE" ? "AI 설명 완료" : "AI 설명 확인";
  }
  if (document.jobStatus === "RUNNING") {
    return "AI 설명 생성 중";
  }
  if (document.jobStatus === "FAILED") {
    return "AI 설명 생성 실패";
  }
  return "AI 설명 대기 중";
}

function formatDate(value: string | null) {
  if (!value) {
    return "진료일 미등록";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function DocumentsPageContent() {
  const { me, loading } = useMe();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<AiDocumentListItem[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [error, setError] = useState("");
  const [relations, setRelations] = useState<CareRelation[]>([]);
  const patientId = searchParams.get("patientId");

  useEffect(() => {
    if (!me) {
      return;
    }
    if (!me.hasPatientProfile && !patientId) {
      setLoadingDocuments(false);
      return;
    }

    let cancelled = false;
    setLoadingDocuments(true);
    setError("");
    fetchAiDocuments({ patientId: patientId ?? undefined, page: 0, size: 20 })
      .then((response) => {
        if (!cancelled) {
          setDocuments(response.items);
        }
      })
      .catch((reason: unknown) => {
        if (cancelled) {
          return;
        }
        if (reason instanceof ApiRequestError && reason.status === 403) {
          setError("이 환자의 문서를 조회할 권한이 없습니다.");
        } else {
          setError("의료문서를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDocuments(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [me, patientId]);

  useEffect(() => {
    if (!me || me.hasPatientProfile || patientId) {
      return;
    }

    let cancelled = false;
    setLoadingRelations(true);
    api<CareRelation[]>("/api/care-relations")
      .then((rows) => {
        if (!cancelled) setRelations(rows.filter((row) => row.status === "ACTIVE"));
      })
      .catch(() => {
        if (!cancelled) {
          setError("연결된 환자 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRelations(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [me, patientId]);

  if (loading || !me) {
    return <PhoneFrame tab="documents"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  }

  const caregiverNeedsPatient = !me.hasPatientProfile && !patientId;

  return (
    <PhoneFrame tab="documents" userName={me.name}>
      <div className="page-title">의료문서함</div>
      <p className="page-sub">등록된 의료문서와 AI 설명을 확인할 수 있어요.</p>

      <div className="doc-upload-zone">
        <div className="icon-circle">📷</div>
        <h4>사진 촬영 또는 파일 업로드</h4>
        <p>검사결과지 · 처방전 · 퇴원안내서 지원</p>
        <p className="hint">문서 업로드 기능은 별도 이슈에서 연결됩니다.</p>
      </div>

      <div className="section-label">
        <span>AI 설명 문서</span>
        <span>{documents.length}건</span>
      </div>

      {caregiverNeedsPatient ? (
        <section className="card document-empty">
          <strong>조회할 환자를 선택해 주세요.</strong>
          <p>연결된 환자를 선택하면 해당 환자의 의료문서를 확인할 수 있습니다.</p>
          {loadingRelations ? <p className="page-sub">연결된 환자를 불러오는 중…</p> : null}
          {!loadingRelations && relations.length === 0 ? (
            <p>활성화된 환자 연결이 없습니다.</p>
          ) : null}
          {!loadingRelations && relations.length > 0 ? (
            <div className="document-patient-options">
              {relations.map((relation) => (
                <Link
                  key={relation.id}
                  className="btn-secondary"
                  href={`/documents?patientId=${encodeURIComponent(relation.patientId)}`}
                >
                  {relation.counterpartName} 문서 보기
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {loadingDocuments ? <p className="page-sub">문서를 불러오는 중…</p> : null}
      {error ? <p className="msg error">{error}</p> : null}

      {!loadingDocuments && !error && !caregiverNeedsPatient && documents.length === 0 ? (
        <section className="card document-empty">
          <strong>아직 등록된 의료문서가 없습니다.</strong>
          <p>문서를 등록하면 AI 설명이 이곳에 표시됩니다.</p>
        </section>
      ) : null}

      <div className="document-list">
        {documents.map((document) => (
          <Link
            key={document.documentId}
            href={`/documents/${document.documentId}${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""}`}
            className="document-list-item"
          >
            <div className="document-list-main">
              <span className="tag">{documentTypeLabel(document.documentType)}</span>
              <strong>{document.documentName}</strong>
              <span>{formatDate(document.visitedOn)} · {document.authorName}</span>
            </div>
            <div className="document-list-side">
              <span className="tag orange">{documentStatusLabel(document)}</span>
              <span className="document-arrow" aria-hidden="true">›</span>
            </div>
          </Link>
        ))}
      </div>
    </PhoneFrame>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsPageContent />
    </Suspense>
  );
}
