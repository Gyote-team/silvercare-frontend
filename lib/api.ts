// 인앱 브라우저처럼 8080 직접 접속을 제한하는 환경에서도 동작하도록 같은 출처의 Next 프록시를 기본으로 쓴다.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type Me = {
  id: string;
  name: string;
  role: "PATIENT" | "CAREGIVER" | "PENDING" | "ADMIN";
  status: string;
  inviteCode: string | null;
  loginProvider: "KAKAO" | "DEMO";
  createdAt: string | null;
};

export type AuthConfig = {
  kakaoReady: boolean;
  demoLogin: boolean;
};

export type CareRelation = {
  id: string;
  patientId: string;
  counterpartName: string;
  statusLabel: string;
  status: string;
  canAccept: boolean;
  canReject: boolean;
  canCancel: boolean;
  canRevoke: boolean;
  requestedAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
};

export type AiDocumentListItem = {
  documentId: string;
  documentName: string;
  documentType: string;
  visitId: string;
  visitedOn: string | null;
  createdAt: string;
  authorName: string;
  documentStatus: string;
  jobStatus: string;
  resultStatus: string | null;
};

export type AiDocumentListResponse = {
  items: AiDocumentListItem[];
  page: number;
  size: number;
  totalCount: number;
};

export type AiDocumentDetailResponse = {
  documentId: string;
  documentName: string;
  documentType: string;
  visitId: string;
  documentStatus: string;
  jobStatus: string;
  resultStatus: string | null;
  title: string | null;
  content: string | null;
  createdAt: string;
  sectionCount: number;
  citationCount: number;
};

export type AiDocumentSectionItem = {
  sentenceId: string;
  sourceItemId: string | null;
  label: string;
  value: string | null;
  unit: string | null;
  hasSource: boolean;
  citationId: string | null;
};

export type AiDocumentSection = {
  sectionId: string;
  sectionType: string;
  title: string;
  items: AiDocumentSectionItem[];
};

export type AiDocumentSectionsResponse = {
  documentId: string;
  sections: AiDocumentSection[];
};

export type AiDocumentExplanationStatusResponse = {
  documentId: string;
  jobStatus: string;
  resultStatus: string | null;
  currentStep: string | null;
  progress: number | null;
  completedAt: string | null;
  detailUrl: string | null;
  failedStep: string | null;
  errorCode: string | null;
  retryable: boolean;
  originalDocumentUrl: string;
};

export type AiDocumentCitation = {
  citationId: string;
  sectionId: string | null;
  sentenceId: string | null;
  sourceItemId: string | null;
  chunkId: string | null;
  pageId: string | null;
  pageNo: number | null;
  sourceText: string | null;
  anchorId: string | null;
  sourceBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  pageWidthPx: number | null;
  pageHeightPx: number | null;
};

export type AiDocumentFact = {
  factId: string;
  factType: string;
  displayValue: string | null;
  originalValue: string | null;
  displayUnit: string | null;
  originalUnit: string | null;
  validationStatus: "MATCHED" | "MISMATCHED";
  pageNo: number | null;
  sourceText: string | null;
  anchorId: string | null;
};

export type AiDocumentFactsResponse = {
  documentId: string;
  items: AiDocumentFact[];
};

export type AiDocumentCitationsResponse = {
  documentId: string;
  citations: AiDocumentCitation[];
};

export type AiDocumentPageResponse = {
  documentId: string;
  pageNo: number;
  pageUrl: string;
  expiresAt: string;
  renderedPage: boolean;
  anchorId: string | null;
  sourceBox: AiDocumentCitation["sourceBox"];
  pageWidthPx: number | null;
  pageHeightPx: number | null;
};

export type AiDocumentListQuery = {
  patientId?: string;
  visitId?: string;
  docType?: string;
  status?: string;
  page?: number;
  size?: number;
};

export type AiQuestionType = "DOCUMENT_EASY_EXPLANATION" | "LAB_RESULT_COMPARISON" | "TEST_RESULT_COMPARISON" | "LAB_REFERENCE_RANGE" | "MEDICATION_SUMMARY" | "FOLLOW_UP_SCHEDULE" | "VISIT_CHECKLIST" | "SOURCE_LOOKUP";

export type AiChatSession = {
  sessionId: string;
  patientId: string;
  title: string | null;
  createdAt: string;
};

export type AiChatMessage = {
  messageId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
  resultDocumentId?: string | null;
  contentFormat?: "MARKDOWN" | null;
  classifiedQuestionType?: AiQuestionType | null;
  documentSaveStatus?: "DRAFT" | "SAVED" | null;
};

export type AiResultEvidence = {
  citationId: string;
  documentId: string | null;
  pageNo: number | null;
  label: string | null;
  sourceText: string | null;
  value: string | null;
  unit: string | null;
};

export type AiResultDocument = {
  resultDocumentId: string;
  jobStatus: string;
  resultStatus: string | null;
  title: string | null;
  content: string | null;
  contentFormat: "MARKDOWN";
  questionType: string;
  saveStatus: "DRAFT" | "SAVED";
  savedAt: string | null;
  citationJson: string | null;
  errorMessage: string | null;
};
export type AiDetailedDocument = { detailedDocumentId: string; status: "GENERATING" | "READY" | "FAILED"; title: string | null; content: string | null; citationJson: string | null; pdfFileName: string | null; errorMessage: string | null; sourcePreview: string | null; };

export class ApiRequestError extends Error {
  status: number;
  error: string;

  constructor(status: number, error: string) {
    super(error);
    this.status = status;
    this.error = error;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  // 인증되지 않은 요청은 응답 본문/Content-Type이 비어 있어도
  // 로그인 리다이렉트가 동작하도록 먼저 처리한다.
  if (response.status === 401) {
    throw new ApiRequestError(401, "unauthorized");
  }
  if (text && (text.trim().startsWith("<") || !contentType.includes("json"))) {
    throw new ApiRequestError(response.status || 502, "server");
  }
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiRequestError(response.status, data?.message ?? data?.error ?? data?.code ?? "fail");
  }
  return data as T;
}

export async function fetchAiDocuments(query: AiDocumentListQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return api<AiDocumentListResponse>(`/api/ai-documents${suffix}`);
}

export function fetchAiChatSessions(patientId?: string) {
  const suffix = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
  return api<AiChatSession[]>(`/api/ai-chat-sessions${suffix}`);
}

export function createAiChatSession(patientId?: string, title?: string) {
  return api<AiChatSession>("/api/ai-chat-sessions", {
    method: "POST",
    body: JSON.stringify({ patientId, title })
  });
}

export function fetchAiChatMessages(sessionId: string) {
  return api<AiChatMessage[]>(`/api/ai-chat-sessions/${encodeURIComponent(sessionId)}/messages`);
}
export type AiChatDetailedDocument = { detailedDocumentId: string; status: "GENERATING" | "READY" | "FAILED"; title: string | null; pdfFileName: string | null; createdAt: string; };
export function fetchAiChatDetailedDocuments(sessionId: string) { return api<AiChatDetailedDocument[]>(`/api/ai-chat-sessions/${encodeURIComponent(sessionId)}/documents`); }

export function fetchAiResultDocument(resultDocumentId: string) {
  return api<AiResultDocument>(`/api/ai-result-documents/${encodeURIComponent(resultDocumentId)}`);
}

export function fetchSavedAiResultDocuments() {
  return api<AiResultDocument[]>("/api/ai-result-documents");
}

export function saveAiResultDocument(resultDocumentId: string) {
  return api<AiResultDocument>(`/api/ai-result-documents/${encodeURIComponent(resultDocumentId)}/save`, { method: "POST" });
}
export function createAiDetailedDocument(resultDocumentId: string) { return api<AiDetailedDocument>(`/api/ai-detailed-documents/from-result/${encodeURIComponent(resultDocumentId)}`, { method: "POST" }); }

export function askAiChat(
  sessionId: string,
  question: string,
  questionType: AiQuestionType | undefined,
  documentIds: string[]
) {
  return api<AiChatMessage[]>(`/api/ai-chat-sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ question, questionType, documentIds })
  });
}

export function fetchAiDocument(documentId: string) {
  return api<AiDocumentDetailResponse>(`/api/ai-documents/${encodeURIComponent(documentId)}`);
}

export function fetchAiDocumentSections(documentId: string, sectionType?: string) {
  const suffix = sectionType ? `?sectionType=${encodeURIComponent(sectionType)}` : "";
  return api<AiDocumentSectionsResponse>(
    `/api/ai-documents/${encodeURIComponent(documentId)}/sections${suffix}`
  );
}

export function fetchAiDocumentExplanationStatus(documentId: string) {
  // 문서 AI 설명 생성 상태를 조회한다.
  return api<AiDocumentExplanationStatusResponse>(
    `/api/ai-documents/${encodeURIComponent(documentId)}/explanation-status`
  );
}

export function fetchAiDocumentCitations(documentId: string) {
  // 문서 설명에 연결된 원문 근거 목록을 조회한다.
  return api<AiDocumentCitationsResponse>(
    `/api/ai-documents/${encodeURIComponent(documentId)}/citations`
  );
}

export function fetchAiDocumentFacts(documentId: string) {
  return api<AiDocumentFactsResponse>(
    `/api/ai-documents/${encodeURIComponent(documentId)}/facts`
  );
}

export function fetchAiDocumentPage(documentId: string, pageNo: number, anchorId?: string | null) {
  const suffix = anchorId ? `?anchorId=${encodeURIComponent(anchorId)}` : "";
  // 원문 페이지 열기에 필요한 서명 URL을 조회한다.
  return api<AiDocumentPageResponse>(
    `/api/ai-documents/${encodeURIComponent(documentId)}/pages/${pageNo}${suffix}`
  );
}

export type WithdrawalResponse = {
  userStatus: string;
  revokedRelationCount: number;
};

export function withdrawAccount() {
  return api<WithdrawalResponse>("/api/me", {
    method: "DELETE",
    body: JSON.stringify({ confirmed: true })
  });
}

export type AccountRole = "PATIENT" | "CAREGIVER";

export type HealthRecord = {
  recordId: string;
  patientId: string;
  authorUserId: string;
  authorName: string;
  visitId: string | null;
  body: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
  proxyWritten: boolean;
};

export type HealthRecordPage = {
  items: HealthRecord[];
  nextCursor: string | null;
  hasNext: boolean;
};

export type LinkedAccounts = {
  currentRole: Me["role"];
  accounts: { role: AccountRole; name: string; current: boolean }[];
};

export function fetchLinkedAccounts() {
  return api<LinkedAccounts>("/api/accounts");
}

export function switchAccount(role: AccountRole) {
  return api<Me>("/api/accounts/switch", {
    method: "POST",
    body: JSON.stringify({ role })
  });
}

export async function logout() {
  await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" }
  });
}

export function kakaoLoginUrl() {
  return `${API_BASE}/oauth2/authorization/kakao`;
}

export function deleteDocument(documentId: string) {
  return api<void>(`/api/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
}

// 의료문서 목록의 문서 한 건(분석 전 문서 포함)
export type MedicalDocumentListItem = {
  documentId: string;
  visitId: string;
  patientId: string;
  documentName: string;
  documentType: string;
  visitedOn: string | null;
  author: { name: string; role: string };
  documentStatus: string;
  latestAiJobStatus: string | null;
  resultStatus: string | null;
  statusChangedAt: string | null;
  retryable: boolean;
  createdAt: string;
};

// 의료문서 목록 조회 응답
export type MedicalDocumentListResponse = {
  items: MedicalDocumentListItem[];
  nextCursor: string | null;
};

// 문서 업로드 응답
export type DocumentUploadResponse = {
  documentId: string;
  visitId: string;
  mimeType: string;
  documentStatus: string;
  latestAiJobStatus: string | null;
  requestId: string;
};

// 환자의 의료문서 목록을 최대 50건 불러온다(개인은 patientId 생략)
export function fetchMedicalDocuments(patientId?: string) {
  const params = new URLSearchParams({ size: "50" });
  if (patientId) {
    params.set("patientId", patientId);
  }
  return api<MedicalDocumentListResponse>(`/api/documents?${params.toString()}`);
}

// 진료 방문에 문서 파일을 올린다(같은 키로 다시 보내면 중복 등록되지 않는다)
export function uploadDocument(
  visitId: string,
  file: File,
  idempotencyKey: string,
  declaredDocType?: string
) {
  const body = new FormData();
  body.append("file", file);
  if (declaredDocType) {
    body.append("declaredDocType", declaredDocType);
  }
  return api<DocumentUploadResponse>(`/api/visits/${encodeURIComponent(visitId)}/documents`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body
  });
}
