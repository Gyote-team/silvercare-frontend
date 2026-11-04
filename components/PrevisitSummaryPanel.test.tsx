// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrevisitSummaryPanel } from "./PrevisitSummaryPanel";
import { ApiRequestError } from "@/lib/api";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", async () => {
  const original = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...original, api: mocks.api };
});
const operation = { requestId: "request-1", operationType: "PREVISIT_SUMMARY", jobStatus: "SUCCEEDED",
  summaryId: "summary-1", resultStatus: "COMPLETE", retryable: false, errorCode: null };
const detail = { summaryId: "summary-1", summary: "사용자가 산책을 기록했습니다.", windowDays: 14,
  createdAt: "2026-11-03T00:00:00Z", usedHealthRecordIds: ["record-1"],
  sourceRecords: [{ healthRecordId: "record-1", recordedAt: "2026-11-02T00:00:00Z", content: "산책 10분" }] };

beforeEach(() => { mocks.api.mockReset(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("진료 전 요약", () => {
  it("대기 중 원본 변경이 확인되면 오래된 요청을 지우고 새로 요청할 수 있다", async () => {
    sessionStorage.setItem("previsit:person:self", "old-request");
    mocks.api.mockResolvedValueOnce({ ...operation, jobStatus: "QUEUED", summaryId: null });
    render(<PrevisitSummaryPanel userId="person" />);
    await screen.findByRole("status");
    mocks.api.mockRejectedValueOnce(new ApiRequestError(409, "changed"));
    fireEvent.click(screen.getByRole("button", { name: "요약 상태 다시 불러오기" }));
    await screen.findByRole("alert");
    expect(sessionStorage.getItem("previsit:person:self")).toBeNull();
    const button = screen.getByRole("button", { name: "현재 기록으로 요약 만들기" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    mocks.api.mockResolvedValueOnce({ requestId: "request-1" }).mockResolvedValueOnce(operation).mockResolvedValueOnce(detail);
    fireEvent.click(button);
    expect(await screen.findByText(detail.summary)).toBeTruthy();
  });

  it("연결이 해제된 저장 요청은 반복 조회하지 않고 즉시 숨긴다", async () => {
    sessionStorage.setItem("previsit:person:self", "old-request");
    mocks.api.mockRejectedValueOnce(new ApiRequestError(403, "denied"));
    render(<PrevisitSummaryPanel userId="person" />);
    await screen.findByRole("alert");
    expect(mocks.api).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "요약 상태 다시 불러오기" })).toBeNull();
    expect(sessionStorage.getItem("previsit:person:self")).toBeNull();
  });

  it("브라우저 저장소 쓰기가 차단돼도 접수된 요약 결과를 표시한다", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage denied"); });
    mocks.api.mockResolvedValueOnce({ requestId: "request-1" }).mockResolvedValueOnce(operation).mockResolvedValueOnce(detail);
    render(<PrevisitSummaryPanel userId="person" />);
    fireEvent.click(screen.getByRole("button", { name: "현재 기록으로 요약 만들기" }));
    expect(await screen.findByText(detail.summary)).toBeTruthy();
  });

  it("기간과 대상만 보내며 생성된 요청 상태에서 결과를 조회한다", async () => {
    mocks.api.mockResolvedValueOnce({ requestId: "request-1", statusUrl: "/api/ai-operations/request-1" })
      .mockResolvedValueOnce(operation).mockResolvedValueOnce(detail);
    render(<PrevisitSummaryPanel userId="caregiver-1" patientId="patient-1" />);
    fireEvent.click(screen.getByRole("button", { name: "현재 기록으로 요약 만들기" }));
    expect(await screen.findByText(detail.summary)).toBeTruthy();
    expect(mocks.api.mock.calls[0][1].body).toBe(JSON.stringify({ patientId: "patient-1", windowDays: 14 }));
    expect(mocks.api.mock.calls[0][1].headers["Idempotency-Key"]).toBeTruthy();
    expect(mocks.api.mock.calls.some(call => call[0] === "/api/previsit-summaries/summary-1")).toBe(true);
    fireEvent.click(screen.getByText("요약에 사용한 건강기록 1건"));
    expect(screen.getByText("산책 10분")).toBeTruthy();
  });

  it("기록 없음은 내용을 만들어내지 않고 별도로 안내한다", async () => {
    sessionStorage.setItem("previsit:person:self", "request-1");
    mocks.api.mockResolvedValueOnce({ ...operation, resultStatus: "INSUFFICIENT" })
      .mockResolvedValueOnce({ ...detail, summary: "선택한 기간에 작성된 건강기록이 없어요.", sourceRecords: [], usedHealthRecordIds: [] });
    render(<PrevisitSummaryPanel userId="person" />);
    expect(await screen.findByText("요약할 기록이 없어요")).toBeTruthy();
    expect(mocks.api.mock.calls.every(call => !call[1]?.method)).toBe(true);
  });

  it("전송 결과를 받지 못하면 같은 키로 재전송한다", async () => {
    mocks.api.mockRejectedValueOnce(new Error("network"));
    render(<PrevisitSummaryPanel userId="person" />);
    fireEvent.click(screen.getByRole("button", { name: "현재 기록으로 요약 만들기" }));
    await screen.findByRole("alert");
    const key = mocks.api.mock.calls[0][1].headers["Idempotency-Key"];
    mocks.api.mockRejectedValueOnce(new Error("network"));
    fireEvent.click(screen.getByRole("button", { name: "현재 기록으로 요약 만들기" }));
    await waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(2));
    expect(mocks.api.mock.calls[1][1].headers["Idempotency-Key"]).toBe(key);
  });

  it("원본 변경으로 재조회가 거절되면 기존 요약을 숨긴다", async () => {
    sessionStorage.setItem("previsit:person:self", "request-1");
    mocks.api.mockResolvedValueOnce(operation).mockResolvedValueOnce(detail);
    render(<PrevisitSummaryPanel userId="person" />);
    expect(await screen.findByText(detail.summary)).toBeTruthy();
    mocks.api.mockRejectedValue(new ApiRequestError(409, "changed"));
    fireEvent.click(screen.getByRole("button", { name: "요약 상태 다시 불러오기" }));
    await screen.findByRole("alert");
    expect(screen.queryByText(detail.summary)).toBeNull();
  });

  it("대상을 바꾸면 이전 요청의 늦은 결과를 표시하지 않는다", async () => {
    sessionStorage.setItem("previsit:guardian:old", "request-1");
    let resolve: (value: unknown) => void = () => {};
    mocks.api.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const view = render(<PrevisitSummaryPanel key="old" userId="guardian" patientId="old" />);
    await waitFor(() => expect(mocks.api).toHaveBeenCalledOnce());
    view.rerender(<PrevisitSummaryPanel key="new" userId="guardian" patientId="new" />);
    resolve(operation);
    await waitFor(() => expect(screen.queryByText(detail.summary)).toBeNull());
    expect(mocks.api.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
