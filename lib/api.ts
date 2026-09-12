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
  counterpartName: string;
  statusLabel: string;
  status: string;
  canAccept: boolean;
  canReject: boolean;
  canCancel: boolean;
  canRevoke: boolean;
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
    throw new ApiRequestError(response.status, data?.error ?? "fail");
  }
  return data as T;
}

export function kakaoLoginUrl() {
  return `${API_BASE}/oauth2/authorization/kakao`;
}
