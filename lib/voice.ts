import { api, ApiRequestError } from "@/lib/api";

export type VoiceStatus = "UPLOADED" | "PROCESSING" | "DRAFT_READY" | "CONFIRMED" | "FAILED" | "CANCELED";
export type VoiceJob = {
  transcriptionId: string; patientId: string; visitId: string | null;
  purpose: "HEALTH_RECORD" | "CONSULTATION"; status: VoiceStatus; statusUrl: string;
  draftText: string | null; errorCode: string | null; recordId: string | null;
  confirmedText: string | null; version: number; createdAt: string;
};
export const voiceLabels: Record<VoiceStatus,string> = { UPLOADED:"변환 대기", PROCESSING:"음성을 글로 바꾸는 중", DRAFT_READY:"내용 확인 필요", CONFIRMED:"기록 저장 완료", FAILED:"변환 실패", CANCELED:"취소됨" };
export const voicePending = (job: VoiceJob | null) => !!job && ["UPLOADED","PROCESSING"].includes(job.status);
export function voiceError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "다시 로그인한 뒤 이용해 주세요.";
    if (error.status === 403) return "이 개인의 음성 기록을 볼 권한이 없어요. 연결 상태를 확인해 주세요.";
    if (error.status === 409) return "음성 기록 상태가 변경됐어요. 다시 불러온 뒤 확인해 주세요.";
    if (error.status >= 500) return "음성 변환을 지금 이용할 수 없어요. 잠시 후 다시 시도해 주세요.";
    return error.message;
  }
  return "연결이 끊겼어요. 다시 시도해 주세요. 같은 파일을 다시 보내도 중복으로 저장되지 않아요.";
}
export function voiceListPath(patientId?: string, visitId?: string) {
  return visitId ? `/api/visits/${encodeURIComponent(visitId)}/recordings` : `/api/transcriptions${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""}`;
}
export function voiceDetail(id: string, signal?: AbortSignal) { return api<VoiceJob>(`/api/transcriptions/${encodeURIComponent(id)}`, {signal}); }
export function uploadVoice(file: File, key: string, consent: boolean, patientId?: string, visitId?: string, signal?: AbortSignal) {
  const data = new FormData(); data.append("audio",file); data.append("consent",String(consent));
  if (patientId) data.append("patientId",patientId);
  const path = visitId ? `/api/visits/${encodeURIComponent(visitId)}/recordings` : "/api/health-records/voice";
  return api<VoiceJob>(path,{method:"POST",headers:{"Idempotency-Key":key},body:data,signal});
}
