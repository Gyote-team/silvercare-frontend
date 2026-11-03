import { ApiRequestError } from "@/lib/api";

export type PrevisitOperation = {
  requestId: string; operationType: "PREVISIT_SUMMARY";
  jobStatus: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  resultStatus: "COMPLETE" | "INSUFFICIENT" | null;
  summaryId: string | null; retryable: boolean; errorCode: string | null;
};
export type PrevisitDetail = {
  summaryId: string; summary: string; usedHealthRecordIds: string[];
  windowDays: number; createdAt: string;
  sourceRecords: { healthRecordId: string; recordedAt: string; content: string }[];
};
export function previsitError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) return "이 개인의 요약을 볼 권한이 없어요. 연결 상태를 확인해 주세요.";
    if (error.status === 409) return "원본 기록이 변경됐어요. 현재 기록으로 요약을 새로 만들어 주세요.";
    if (error.status === 503) return "요약 서비스를 준비 중이에요. 잠시 후 다시 시도해 주세요.";
    return error.message;
  }
  return "요약 상태를 불러오지 못했어요. 다시 불러오기를 눌러 주세요.";
}
