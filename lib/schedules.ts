import { api, ApiRequestError } from "./api";
export type ScheduleType = "MEDICATION" | "REVISIT" | "TEST" | "PERSONAL" | "OTHER";
export type ScheduleStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type ScheduleInput = {
  title: string; scheduleType: ScheduleType; startsAt: string; endsAt: string | null;
  repeatFrequency: "NONE" | "DAILY" | "WEEKLY"; repeatInterval: number; repeatUntil: string | null;
};
export type Schedule = ScheduleInput & { scheduleId: string; patientId: string; actionItemId: string | null;
  status: ScheduleStatus; version: number; nextOccurrenceAt: string | null };
export type SchedulePage = { items: Schedule[]; page: number; size: number; totalCount: number };
export const scheduleTypes: Record<ScheduleType, string> = { MEDICATION: "복약", REVISIT: "재진", TEST: "검사", PERSONAL: "개인 일정", OTHER: "기타" };
export const scheduleStatuses: Record<ScheduleStatus, string> = { SCHEDULED: "예정", COMPLETED: "완료", CANCELLED: "취소" };
export function scheduleQuery(patientId?: string) { return patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""; }
export function fetchSchedules(patientId: string | undefined, page: number, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), size: "20" });
  if (patientId) query.set("patientId", patientId);
  return api<SchedulePage>(`/api/schedules?${query}`, { signal });
}
export function scheduleError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === "SCHEDULE_004") return "후보를 승인해 만든 일정은 종류를 바꿀 수 없어요.";
    if (error.code === "SCHEDULE_005") return "완료·취소된 일정은 수정하거나 다시 활성화할 수 없어요.";
    if (error.status === 409) return "다른 화면에서 먼저 변경되었어요. 새로 불러온 뒤 다시 확인해 주세요.";
    if (error.status === 403) return "관리 권한이 없어요. 개인과의 연결 상태를 확인해 주세요.";
    if (error.status === 404) return "삭제되었거나 찾을 수 없는 일정이에요. 목록에서 다시 확인해 주세요.";
    if (error.status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
    if (error.status === 400) return "날짜와 반복 조건을 확인해 주세요. 반복은 복약 일정에만, 시작일부터 최대 1년까지 지정할 수 있어요.";
  }
  return "처리 결과를 확인하지 못했어요. 새로 불러와 상태를 확인해 주세요.";
}
export function localDateTime(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export function displayScheduleTime(iso: string) { return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)); }
