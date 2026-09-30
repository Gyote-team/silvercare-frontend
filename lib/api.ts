export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

export type Me = {
  id: string;
  name: string;
  role: "PATIENT" | "CAREGIVER" | "PENDING" | "ADMIN";
  status: string;
  inviteCode: string | null;
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

export type AiDocumentListQuery = {
  patientId?: string;
  visitId?: string;
  docType?: string;
  status?: string;
  page?: number;
  size?: number;
};

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
  if (init?.body && !headers.has("Content-Type")) {
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
  if (text && (text.trim().startsWith("<") || !contentType.includes("json"))) {
    throw new ApiRequestError(response.status || 502, "server");
  }
  const data = text ? JSON.parse(text) : null;
  if (response.status === 401) {
    throw new ApiRequestError(401, "unauthorized");
  }
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
  return api<AiDocumentExplanationStatusResponse>(
    `/api/ai-documents/${encodeURIComponent(documentId)}/explanation-status`
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

export function kakaoLoginUrl() {
  return `${API_BASE}/oauth2/authorization/kakao`;
}
