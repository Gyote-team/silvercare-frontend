"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import {
  ApiRequestError,
  api,
  fetchAiDocuments,
  fetchMedicalDocuments,
  uploadDocument,
  type AiDocumentListItem,
  type CareRelation,
  type MedicalDocumentListItem
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

// 한 번에 올릴 수 있는 파일의 최대 크기(20MB)
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

// 분석이 끝나지 않은 문서의 상태 문구
const pendingStatusLabels: Record<string, string> = {
  UPLOADED: "분석 대기 중",
  PROCESSING: "분석 중",
  FAILED: "분석 실패"
};

// 업로드할 때 고를 수 있는 진료 방문
type VisitOption = { visitId: string; visitedOn: string | null };

// 어느 환자의 문서 목록인지 함께 기억하는 조회 결과
type MedicalDocumentsState = {
  patientId: string | null;
  items: MedicalDocumentListItem[];
  failed: boolean;
};

// 문서 목록에서 방문을 중복 없이 모아 진료일 최신순으로 정렬한다
function collectVisits(items: MedicalDocumentListItem[]): VisitOption[] {
  const visits = new Map<string, VisitOption>();
  items.forEach((item) => {
    if (!visits.has(item.visitId)) {
      visits.set(item.visitId, { visitId: item.visitId, visitedOn: item.visitedOn });
    }
  });
  return Array.from(visits.values()).sort((a, b) =>
    (b.visitedOn ?? "").localeCompare(a.visitedOn ?? "")
  );
}

// 업로드 중복 방지용 키를 만든다(randomUUID가 없는 HTTP 환경은 시간+난수)
function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// 업로드 실패 원인을 사용자에게 보여줄 문장으로 바꾼다
function uploadErrorMessage(reason: unknown) {
  if (reason instanceof ApiRequestError) {
    if (reason.status === 403) {
      return "이 환자의 문서를 올릴 권한이 없습니다.";
    }
    if (reason.error !== "server" && reason.error !== "fail") {
      return reason.error;
    }
  }
  return "문서를 올리지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

// 진료일·문서 종류·파일을 골라 문서를 올리는 영역
function UploadZone({
  visits,
  loading,
  loadFailed,
  onUploaded
}: {
  visits: VisitOption[];
  loading: boolean;
  loadFailed: boolean;
  onUploaded: () => void;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [visitId, setVisitId] = useState("");
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedVisitId = visits.some((visit) => visit.visitId === visitId)
    ? visitId
    : visits[0]?.visitId ?? "";

  // 고른 파일과 중복 방지 키를 비운다
  function clearFile() {
    setFile(null);
    setIdempotencyKey("");
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  async function handleUpload() {
    setMessage("");
    setError("");
    if (!selectedVisitId) {
      return;
    }
    if (!file) {
      setError("올릴 파일을 선택해 주세요.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("파일이 20MB를 넘어요. 더 작은 파일을 올려 주세요.");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument(selectedVisitId, file, idempotencyKey, docType || undefined);
      clearFile();
      setMessage("문서를 올렸어요. AI 분석이 끝나면 아래 목록에 표시돼요.");
      onUploaded();
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 401) {
        router.replace("/login");
        return;
      }
      setError(uploadErrorMessage(caught));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="doc-upload-zone">
      <div className="icon-circle">📷</div>
      <h4>사진 촬영 또는 파일 업로드</h4>
      <p>검사결과지 · 처방전 · 퇴원안내서 지원</p>
      {loading ? <p className="hint">진료 정보를 불러오는 중…</p> : null}
      {loadFailed ? (
        <p className="msg error">진료 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      ) : null}
      {!loading && !loadFailed && visits.length === 0 ? (
        <p className="hint">진료 방문이 등록된 뒤에 문서를 올릴 수 있어요.</p>
      ) : null}
      {visits.length > 0 ? (
        <>
          <label className="upload-field">
            진료일
            <select
              value={selectedVisitId}
              onChange={(event) => {
                setVisitId(event.target.value);
                // 같은 키를 다른 방문에 쓰면 서버가 거절하므로 키를 새로 만든다
                if (file) {
                  setIdempotencyKey(createIdempotencyKey());
                }
              }}
            >
              {visits.map((visit) => (
                <option key={visit.visitId} value={visit.visitId}>
                  {formatDate(visit.visitedOn)}
                </option>
              ))}
            </select>
          </label>
          <label className="upload-field">
            문서 종류 (선택)
            <select value={docType} onChange={(event) => setDocType(event.target.value)}>
              <option value="">선택 안 함</option>
              {Object.entries(documentTypeLabels)
                .filter(([type]) => type !== "UNKNOWN")
                .map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
            </select>
          </label>
          <div className="upload-field">
            <span>파일</span>
            <label className="upload-file-row">
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  setFile(picked);
                  setIdempotencyKey(picked ? createIdempotencyKey() : "");
                  setMessage("");
                  setError("");
                }}
              />
              <span className={file ? "upload-file-name" : "upload-file-name empty"}>
                {file ? file.name : "선택된 파일 없음"}
              </span>
              {file ? (
                <button
                  type="button"
                  className="upload-file-clear"
                  aria-label="선택한 파일 지우기"
                  disabled={uploading}
                  onClick={(event) => {
                    // 바깥 label이 파일 선택 창을 열지 않게 막는다
                    event.preventDefault();
                    clearFile();
                    setMessage("");
                    setError("");
                  }}
                >
                  ✕
                </button>
              ) : null}
              <span className="upload-file-button">파일 선택</span>
            </label>
          </div>
          <button type="button" className="btn-primary" disabled={uploading} onClick={handleUpload}>
            {uploading ? "올리는 중…" : "문서 올리기"}
          </button>
        </>
      ) : null}
      {message ? <p className="msg">{message}</p> : null}
      {error ? <p className="msg error">{error}</p> : null}
    </div>
  );
}

// AI 분석이 끝나지 않은 문서 목록(상세 화면 링크 없음)
function PendingDocuments({ documents }: { documents: MedicalDocumentListItem[] }) {
  const pending = documents.filter((document) => document.documentStatus in pendingStatusLabels);
  if (pending.length === 0) {
    return null;
  }
  return (
    <>
      <div className="section-label">
        <span>분석 대기 문서</span>
        <span>{pending.length}건</span>
      </div>
      <div className="document-list">
        {pending.map((document) => (
          <div key={document.documentId} className="document-list-item">
            <div className="document-list-main">
              <span className="tag">{documentTypeLabel(document.documentType)}</span>
              <strong>{document.documentName}</strong>
              <span>{formatDate(document.visitedOn)} · {document.author.name}</span>
            </div>
            <div className="document-list-side">
              <span className="tag orange">{pendingStatusLabels[document.documentStatus]}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function DocumentsPageContent() {
  const { me, loading } = useMe();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<AiDocumentListItem[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [error, setError] = useState("");
  const [relations, setRelations] = useState<CareRelation[]>([]);
  const [medical, setMedical] = useState<MedicalDocumentsState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const patientId = searchParams.get("patientId");

  useEffect(() => {
    if (!me) {
      return;
    }
    if (me.role === "CAREGIVER" && !patientId) {
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
    if (!me || me.role !== "CAREGIVER" || patientId) {
      return;
    }

    let cancelled = false;
    setLoadingRelations(true);
    api<CareRelation[]>("/api/care-relations")
      .then((rows) => {
        if (!cancelled) {
          setRelations(rows.filter((row) => row.status === "ACTIVE"));
        }
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

  useEffect(() => {
    if (!me || (me.role === "CAREGIVER" && !patientId)) {
      return;
    }

    let cancelled = false;
    fetchMedicalDocuments(patientId ?? undefined)
      .then((response) => {
        if (!cancelled) {
          setMedical({ patientId, items: response.items, failed: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMedical({ patientId, items: [], failed: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [me, patientId, reloadKey]);

  if (loading || !me) {
    return <PhoneFrame tab="documents"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  }

  const caregiverNeedsPatient = me.role === "CAREGIVER" && !patientId;
  // 다른 환자의 목록이 남아 있으면 쓰지 않는다
  const currentMedical = medical && medical.patientId === patientId ? medical : null;
  const medicalDocuments = currentMedical?.items ?? [];

  return (
    <PhoneFrame tab="documents" chatLocked={me.role === "CAREGIVER"} userName={me.name}>
      <div className="page-title">의료문서함</div>
      <p className="page-sub">등록된 의료문서와 AI 설명을 확인할 수 있어요.</p>

      {!caregiverNeedsPatient ? (
        <UploadZone
          key={patientId ?? "self"}
          visits={collectVisits(medicalDocuments)}
          loading={!currentMedical}
          loadFailed={currentMedical?.failed ?? false}
          onUploaded={() => setReloadKey((value) => value + 1)}
        />
      ) : null}

      <PendingDocuments documents={medicalDocuments} />

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
