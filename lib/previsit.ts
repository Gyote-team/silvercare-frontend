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
    if (error.status === 404) return "이전 요약 요청을 찾을 수 없어요. 현재 기록으로 새로 만들어 주세요.";
    if (error.status === 503) return "요약 서비스를 준비 중이에요. 잠시 후 다시 시도해 주세요.";
    return error.message;
  }
  return "요약 상태를 불러오지 못했어요. 다시 불러오기를 눌러 주세요.";
}

export function previsitFailureMessage(code: string | null) {
  switch (code) {
    case "SOURCE_UNAVAILABLE": return "연결 상태나 원본 기록이 변경됐어요. 확인 후 새로 요청해 주세요.";
    case "AI_API_KEY_MISSING": return "요약 서비스 설정이 아직 준비되지 않았어요.";
    case "AI_OUTPUT_LIMIT": return "요약할 내용이 길어 완료하지 못했어요. 기간을 줄여 다시 요청해 주세요.";
    case "AI_CONTENT_FILTERED": return "선택한 기록으로 요약을 만들지 못했어요. 원본 기록을 직접 확인해 주세요.";
    default: return "잠시 후 현재 기록으로 다시 요청해 주세요.";
  }
}
