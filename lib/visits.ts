import { api, ApiRequestError } from "@/lib/api";

export type VisitStatus = "SCHEDULED" | "DONE" | "CANCELED";
export type Visit = {
  visitId: string; patientId: string; visitedOn: string; hospitalName: string | null;
  department: string | null; memo: string | null; visitStatus: VisitStatus;
  documentIds: string[]; healthRecordIds: string[]; createdAt: string; updatedAt: string; version: number;
};
export type VisitPage = { items: Visit[]; nextCursor: string | null; hasNext: boolean };
export type VisitInput = {
  patientId?: string; visitedOn: string; hospitalName: string | null;
  department: string | null; memo: string | null; visitStatus: VisitStatus; version?: number;
};
export const visitStatusLabel: Record<VisitStatus, string> = { SCHEDULED: "방문 예정", DONE: "방문 완료", CANCELED: "취소됨" };
export function todayInSeoul() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function visitDateLabel(date: string) {
  return new Date(`${date}T00:00:00+09:00`).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short" });
}
export function visitError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
    if (error.status === 403) return "이 개인의 방문을 관리할 권한이 없어요. 연결 상태를 확인해 주세요.";
    if (error.status === 404) return "방문을 찾을 수 없어요. 목록을 다시 확인해 주세요.";
    if (error.status === 409) return "다른 곳에서 방문 정보가 변경되어 현재 화면이 오래됐어요. 방문을 다시 불러온 뒤 수정해 주세요.";
    if (error.status >= 500) return "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
    return error.message;
  }
  return "요청을 처리하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.";
}
export function visitListPath(patientId: string | undefined, includeCanceled: boolean, cursor?: string) {
  const params = new URLSearchParams({ includeCanceled: String(includeCanceled), size: "20" });
  if (patientId) params.set("patientId", patientId);
  if (cursor) params.set("cursor", cursor);
  return `/api/visits?${params}`;
}
export function getVisit(id: string, signal?: AbortSignal) { return api<Visit>(`/api/visits/${encodeURIComponent(id)}`, { signal }); }
export function writeVisit(input: VisitInput, id?: string) {
  return api<Visit>(id ? `/api/visits/${encodeURIComponent(id)}` : "/api/visits", { method: id ? "PUT" : "POST", body: JSON.stringify(input) });
}
export function cancelVisit(id: string) { return api<void>(`/api/visits/${encodeURIComponent(id)}`, { method: "DELETE" }); }
