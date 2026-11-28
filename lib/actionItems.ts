import { api, ApiRequestError } from "./api";

export const approvalLabels = { PENDING: "확인 대기", APPROVED: "승인됨", REJECTED: "거절됨", CANCELED: "취소됨" } as const;
export type ApprovalStatus = keyof typeof approvalLabels;
export const typeLabels = { MEDICATION: "복약", REVISIT: "재진", TEST: "검사", CAUTION: "주의사항", OTHER: "기타" } as const;
export type ActionItem = {
  actionItemId: string; patientId: string; visitId: string; documentId: string;
  documentName: string | null; type: keyof typeof typeLabels; title: string; description: string | null;
  estimatedAt: string | null; approvalStatus: ApprovalStatus; cancelReason: string | null;
  sourceDocumentDeleted: boolean; sourceItemId: string | null; confidence: number | null;
  source: { pageNo: number | null; sourceText: string } | null; sourceExcerpt: string | null;
  approvedByUserId: string | null; approvedAt: string | null; createdAt: string;
};
export type ActionItemPage = { items: ActionItem[]; nextCursor: string | null };
export function actionQuery(patientId?: string, approvalStatus?: ApprovalStatus, cursor?: string) {
  const query = new URLSearchParams();
  if (patientId) query.set("patientId", patientId);
  if (approvalStatus) query.set("approvalStatus", approvalStatus);
  if (cursor) query.set("cursor", cursor);
  return query.size ? `?${query}` : "";
}
export function fetchActionItems(patientId?: string, status?: ApprovalStatus, cursor?: string, signal?: AbortSignal) {
  return api<ActionItemPage>(`/api/action-items${actionQuery(patientId, status, cursor)}`, { signal });
}
export function actionError(error: unknown, operation: "조회" | "처리" = "조회") {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
    if (error.status === 403) return "이 후보를 볼 권한이 없어요. 개인과의 연결 상태를 확인해 주세요.";
    if (error.status === 404) return "할 일 후보를 찾을 수 없어요. 목록에서 다시 확인해 주세요.";
    if (error.status === 409) return "이미 처리됐거나 원본 문서·방문이 취소된 후보예요. 최신 상태를 다시 확인해 주세요.";
    if (error.status === 400) return "조회 조건이 올바르지 않아요. 목록에서 다시 선택해 주세요.";
  }
  return operation === "처리" ? "처리 결과를 확인하지 못했어요. 후보 상태를 다시 확인해 주세요." : "할 일 후보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
}
export function actionDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}
