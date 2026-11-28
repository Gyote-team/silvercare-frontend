// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CandidateActions } from "./CandidateActions";
import { ScheduleEditorContent } from "./ScheduleEditor";
import { ScheduleList } from "./ScheduleWorkspace";
import { ScheduleForm } from "./ScheduleForm";
import { ApiRequestError } from "@/lib/api";
import { localDateTime, type Schedule } from "@/lib/schedules";
import type { ActionItem } from "@/lib/actionItems";

const mocks = vi.hoisted(() => ({ api: vi.fn(), replace: vi.fn() }));
vi.mock("@/lib/api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api")>(), api: mocks.api }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), useSearchParams: () => new URLSearchParams() }));
const candidate = { actionItemId: "candidate", patientId: "person", title: "복약 안내", type: "MEDICATION", approvalStatus: "PENDING", sourceDocumentDeleted: false, estimatedAt: "2026-12-01T00:00:00Z" } as ActionItem;
const schedule: Schedule = { scheduleId: "schedule", patientId: "person", actionItemId: "candidate", title: "아침 복약", scheduleType: "MEDICATION", startsAt: "2026-12-01T00:00:00Z", endsAt: null, repeatFrequency: "DAILY", repeatInterval: 1, repeatUntil: "2026-12-07", status: "SCHEDULED", nextOccurrenceAt: "2026-12-01T00:00:00Z", version: 2 };
beforeEach(() => { mocks.api.mockReset(); mocks.replace.mockReset(); });
afterEach(cleanup);

it("후보 승인에서 한국 시간의 아침·저녁과 같은 반복 규칙을 한 요청으로 보낸다", async () => {
  mocks.api.mockResolvedValueOnce({ scheduleIds: ["one", "two"] }); const reload = vi.fn();
  render(<CandidateActions item={candidate} onReload={reload} />);
  fireEvent.click(screen.getByText("일정 확인하고 승인"));
  expect((screen.getByLabelText("시작 일시") as HTMLInputElement).value).toBe("2026-12-01T09:00");
  fireEvent.change(screen.getByLabelText("반복"), { target: { value: "DAILY" } });
  fireEvent.change(screen.getByLabelText("반복 종료일"), { target: { value: "2026-12-07" } });
  fireEvent.click(screen.getByText("+ 복약 시간 추가"));
  fireEvent.change(screen.getByLabelText("추가 복약 시간 1"), { target: { value: "19:00" } });
  fireEvent.click(screen.getByText("승인하고 일정 등록"));
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  const body = JSON.parse(mocks.api.mock.calls[0][1].body);
  expect(body.schedules).toHaveLength(2);
  expect(body.schedules.map((row: Schedule) => row.startsAt)).toEqual(["2026-12-01T00:00:00.000Z", "2026-12-01T10:00:00.000Z"]);
  expect(body.schedules[1].repeatUntil).toBe("2026-12-07");
});

it("거절은 확인 후에만 요청하고 409 뒤에는 최신 상태 확인 전 재전송을 막는다", async () => {
  mocks.api.mockRejectedValueOnce(new ApiRequestError(409, "conflict")); const reload = vi.fn();
  render(<CandidateActions item={candidate} onReload={reload} />);
  fireEvent.click(screen.getByText("이 후보 거절")); expect(mocks.api).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("거절 확정"));
  await screen.findByText("후보 상태 다시 확인");
  expect(screen.queryByText("거절 확정")).toBeNull();
  expect(mocks.api).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("후보 상태 다시 확인")); expect(reload).toHaveBeenCalledOnce();
});

it("완료된 후보에는 재승인 버튼 대신 일정 링크만 표시한다", () => {
  render(<CandidateActions item={{ ...candidate, approvalStatus: "APPROVED" }} onReload={vi.fn()} />);
  expect(screen.getByText("확정 일정 확인 ›").getAttribute("href")).toBe("/schedules?patientId=person");
  expect(screen.queryByText("일정 확인하고 승인")).toBeNull();
});

it("중복 복약 시간과 시작보다 빠른 종료는 서버로 보내지 않는다", () => {
  const save = vi.fn(); render(<ScheduleForm initial={{ title: "복약", startsAt: schedule.startsAt }} lockedType="MEDICATION" allowMultiple submitLabel="저장" onSave={save} />);
  fireEvent.click(screen.getByText("+ 복약 시간 추가"));
  fireEvent.change(screen.getByLabelText("추가 복약 시간 1"), { target: { value: "09:00" } });
  fireEvent.click(screen.getByText("저장")); expect(screen.getByRole("alert").textContent).toContain("서로 다르게");
  expect(save).not.toHaveBeenCalled();
});

it("오래된 일정 수정은 막고 재조회한 새 버전으로만 저장한다", async () => {
  mocks.api.mockResolvedValueOnce(schedule).mockRejectedValueOnce(new ApiRequestError(409, "old"))
    .mockResolvedValueOnce({ ...schedule, version: 3, title: "다른 사람이 바꾼 복약" });
  render(<ScheduleEditorContent id="schedule" />);
  await screen.findByDisplayValue("아침 복약");
  fireEvent.click(screen.getByText("일정 수정 저장"));
  await screen.findByText("최신 일정 다시 불러오기");
  expect(JSON.parse(mocks.api.mock.calls[1][1].body).version).toBe(2);
  expect(screen.queryByText("일정 수정 저장")).toBeNull();
  fireEvent.click(screen.getByText("최신 일정 다시 불러오기"));
  await screen.findByDisplayValue("다른 사람이 바꾼 복약");
});

it("반복 삭제는 확인과 최신 버전을 포함해 보내고 목록으로 돌아간다", async () => {
  mocks.api.mockResolvedValueOnce(schedule).mockResolvedValueOnce(undefined);
  render(<ScheduleEditorContent id="schedule" patientId="person" />);
  await screen.findByDisplayValue("아침 복약");
  fireEvent.click(screen.getByText("일정 취소·삭제")); expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert").textContent).toContain("반복 일정 전체");
  fireEvent.click(screen.getByText("삭제 확정"));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/schedules?patientId=person"));
  expect(mocks.api.mock.calls[1][0]).toBe("/api/schedules/schedule?version=2");
});

it("네트워크 결과가 불명확한 수동 등록은 자동 재전송하지 않고 목록 확인을 안내한다", async () => {
  mocks.api.mockRejectedValueOnce(new Error("network")); render(<ScheduleEditorContent />);
  fireEvent.change(screen.getByLabelText("일정 제목"), { target: { value: "진료" } });
  fireEvent.change(screen.getByLabelText("시작 일시"), { target: { value: "2026-12-01T09:00" } });
  fireEvent.click(screen.getByText("일정 등록"));
  await screen.findByText("일정 목록에서 등록 결과 확인");
  expect(screen.queryByText("일정 등록")).toBeNull(); expect(mocks.api).toHaveBeenCalledTimes(1);
});

it("일정 목록의 다음 페이지와 대상별 경로를 유지한다", async () => {
  mocks.api.mockResolvedValueOnce({ items: [schedule], page: 0, size: 20, totalCount: 21 }).mockResolvedValueOnce({ items: [], page: 1, size: 20, totalCount: 21 });
  render(<ScheduleList patientId="person" />);
  await screen.findByText("아침 복약");
  expect(screen.getByText("아침 복약").closest("a")?.getAttribute("href")).toBe("/schedules/schedule?patientId=person");
  fireEvent.click(screen.getByText("다음"));
  await waitFor(() => expect(mocks.api.mock.calls[1][0]).toBe("/api/schedules?page=1&size=20&patientId=person"));
  expect(screen.queryByText("아침 복약")).toBeNull();
});

it("날짜 입력은 실행 브라우저의 시간대와 무관하게 한국 시간으로 표시한다", () => {
  expect(localDateTime("2026-12-01T23:30:00Z")).toBe("2026-12-02T08:30");
});

it.each([[404, "할 일 후보를 찾을 수"], [409, "이미 처리됐거나"]])("후보 처리 %s 오류는 후보 문맥으로 안내한다", async (status, text) => {
  mocks.api.mockRejectedValueOnce(new ApiRequestError(status, "error"));
  render(<CandidateActions item={candidate} onReload={vi.fn()} />);
  fireEvent.click(screen.getByText("이 후보 거절")); fireEvent.click(screen.getByText("거절 확정"));
  expect((await screen.findByRole("alert")).textContent).toContain(text);
  expect(screen.getByRole("alert").textContent).not.toContain("찾을 수 없는 일정");
});

it("후보에서 승인한 일정은 종류 선택을 숨기고 PUT 취소 옵션을 제공하지 않는다", async () => {
  mocks.api.mockResolvedValueOnce(schedule); render(<ScheduleEditorContent id="schedule" />);
  await screen.findByDisplayValue("아침 복약");
  expect(screen.queryByLabelText("일정 종류")).toBeNull();
  expect(screen.queryByRole("option", { name: "취소" })).toBeNull();
  expect(screen.getByText("일정 취소·삭제")).toBeTruthy();
});

it("완료된 일정은 읽기 전용으로 표시하고 다시 예정으로 수정할 수 없다", async () => {
  mocks.api.mockResolvedValueOnce({ ...schedule, status: "COMPLETED" }); render(<ScheduleEditorContent id="schedule" />);
  await screen.findByText("아침 복약"); expect(screen.queryByText("일정 수정 저장")).toBeNull();
  expect(screen.queryByLabelText("일정 상태")).toBeNull();
});
