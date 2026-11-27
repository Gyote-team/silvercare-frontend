// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CandidatePage from "./page";
import { CandidateList } from "@/components/CandidateList";
import { CandidateContent } from "@/components/CandidateDetail";
import { ApiRequestError } from "@/lib/api";

const mocks = vi.hoisted(() => ({ api: vi.fn(), replace: vi.fn(), query: "", me: { id: "personal", name: "개인", role: "PATIENT" } }));
vi.mock("@/lib/api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api")>(), api: mocks.api }));
vi.mock("@/lib/useMe", () => ({ useMe: () => ({ me: mocks.me, loading: false }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mocks.query), useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/components/PhoneFrame", () => ({ PhoneFrame: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
const candidate = { actionItemId: "one", patientId: "patient-a", documentId: "doc-a", visitId: "visit-a", title: "재진 안내", type: "REVISIT", approvalStatus: "PENDING", createdAt: "2026-11-27T01:00:00Z", estimatedAt: null, documentName: "진료 안내문", source: { pageNo: 2, sourceText: "일주일 뒤 재진해 주세요." }, sourceDocumentDeleted: false };
beforeEach(() => { mocks.api.mockReset(); mocks.replace.mockReset(); mocks.query = ""; mocks.me = { id: "personal", name: "개인", role: "PATIENT" }; });
afterEach(cleanup);

it("본인은 patientId 없이 조회하고 상태·커서를 함께 전달해 더 불러온다", async () => {
  mocks.api.mockResolvedValueOnce({ items: [candidate], nextCursor: "next+/=" }).mockResolvedValueOnce({ items: [{ ...candidate, actionItemId: "two", title: "검사 안내" }], nextCursor: null });
  render(<CandidateList status="PENDING" />);
  await screen.findByText("재진 안내");
  fireEvent.click(screen.getByText("후보 더 보기"));
  await screen.findByText("검사 안내");
  expect(mocks.api.mock.calls[0][0]).toBe("/api/action-items?approvalStatus=PENDING");
  expect(mocks.api.mock.calls[1][0]).toBe("/api/action-items?approvalStatus=PENDING&cursor=next%2B%2F%3D");
  expect(screen.getByText("재진 안내").closest("a")?.getAttribute("href")).toBe("/action-items/one?approvalStatus=PENDING");
});

it("대상 변경 시 이전 결과를 숨기고 뒤늦게 도착한 응답도 버린다", async () => {
  let finish!: (value: unknown) => void;
  mocks.api.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ items: [{ ...candidate, title: "새 개인의 후보" }], nextCursor: null });
  const view = render(<CandidateList key="a" patientId="patient-a" />);
  view.rerender(<CandidateList key="b" patientId="patient-b" />);
  await screen.findByText("새 개인의 후보");
  finish({ items: [candidate], nextCursor: null });
  await waitFor(() => expect(screen.queryByText("재진 안내")).toBeNull());
});

it("보호자는 ACTIVE 연결만 선택할 수 있고 선택 전에는 후보를 요청하지 않는다", async () => {
  mocks.me = { id: "care", name: "보호자", role: "CAREGIVER" };
  mocks.api.mockResolvedValueOnce([{ id: "a", patientId: "a", status: "ACTIVE", counterpartName: "개인 A" }, { id: "b", patientId: "b", status: "ACTIVE", counterpartName: "개인 B" }, { id: "c", patientId: "c", status: "REVOKED", counterpartName: "해제된 개인" }]);
  render(<CandidatePage />);
  await screen.findByRole("option", { name: "개인 A" });
  expect(screen.queryByRole("option", { name: "해제된 개인" })).toBeNull();
  expect(mocks.api).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("확인할 개인"), { target: { value: "b" } });
  expect(mocks.replace).toHaveBeenCalledWith("/action-items?patientId=b");
});

it("역할 변경 후에는 보호 대상과 필터의 이전 결과가 남지 않는다", async () => {
  mocks.api.mockResolvedValueOnce({ items: [candidate], nextCursor: "old" });
  const view = render(<CandidatePage />);
  await screen.findByText("재진 안내");
  mocks.me = { id: "care", name: "보호자", role: "CAREGIVER" };
  mocks.api.mockImplementationOnce(() => new Promise(() => {}));
  view.rerender(<CandidatePage />);
  expect(screen.queryByText("재진 안내")).toBeNull();
});

it("상태를 바꾸면 이전 커서를 버리고 새 목록을 처음부터 조회한다", async () => {
  mocks.api.mockResolvedValueOnce({ items: [candidate], nextCursor: "old" })
    .mockResolvedValueOnce({ items: [{ ...candidate, actionItemId: "two", title: "다음 후보" }], nextCursor: null })
    .mockResolvedValueOnce({ items: [], nextCursor: null });
  const view = render(<CandidatePage />);
  await screen.findByText("재진 안내");
  fireEvent.click(screen.getByText("후보 더 보기"));
  await screen.findByText("다음 후보");
  mocks.query = "approvalStatus=CANCELED&patientId=another-patient";
  view.rerender(<CandidatePage />);
  await screen.findByText("아직 해당하는 후보가 없어요");
  expect(mocks.api.mock.calls[2][0]).toBe("/api/action-items?approvalStatus=CANCELED");
  expect(screen.queryByText("재진 안내")).toBeNull();
});

it.each([[401, "로그인이 만료"], [400, "조회 조건"]])("%s 오류를 빈 목록으로 오해하지 않도록 안내한다", async (status, message) => {
  mocks.api.mockRejectedValueOnce(new ApiRequestError(status, "error"));
  render(<CandidateList />);
  expect((await screen.findByRole("alert")).textContent).toContain(message);
  expect(screen.queryByText("아직 해당하는 후보가 없어요")).toBeNull();
});

it("403이면 후보 내용을 표시하지 않고 연결 권한 안내를 보여준다", async () => {
  mocks.api.mockRejectedValueOnce(new ApiRequestError(403, "forbidden"));
  render(<CandidateContent actionItemId="one" />);
  expect((await screen.findByRole("alert")).textContent).toContain("연결 상태");
  expect(screen.queryByText("출처 문서 보기 ›")).toBeNull();
});

it("삭제된 문서는 서버에 근거가 있더라도 원문·문서 링크를 숨긴다", async () => {
  mocks.api.mockResolvedValueOnce({ ...candidate, sourceDocumentDeleted: true, approvalStatus: "CANCELED", cancelReason: "DOCUMENT_DELETED" });
  render(<CandidateContent actionItemId="one" />);
  await screen.findByText("재진 안내");
  expect(screen.queryByText("일주일 뒤 재진해 주세요.")).toBeNull();
  expect(screen.queryByText("출처 문서 보기 ›")).toBeNull();
  expect(screen.getByText("원본 문서가 삭제되어 문서와 근거를 볼 수 없어요.")).toBeTruthy();
});

it("상세에서 출처와 페이지 근거를 표시하고 후보로 돌아올 경로를 문서에 전달한다", async () => {
  mocks.api.mockResolvedValueOnce(candidate);
  render(<CandidateContent actionItemId="one" query="?approvalStatus=PENDING" />);
  await screen.findByText("2페이지");
  expect(screen.getByText("일주일 뒤 재진해 주세요.")).toBeTruthy();
  const href = screen.getByText("출처 문서 보기 ›").getAttribute("href")!;
  expect(new URL(href, "http://localhost").searchParams.get("returnTo")).toBe("/action-items/one?approvalStatus=PENDING");
});

it("빈 결과와 404를 구분해서 안내한다", async () => {
  mocks.api.mockResolvedValueOnce({ items: [], nextCursor: null });
  const view = render(<CandidateList />);
  await screen.findByText("아직 해당하는 후보가 없어요");
  mocks.api.mockRejectedValueOnce(new ApiRequestError(404, "missing"));
  view.rerender(<CandidateContent actionItemId="missing" />);
  expect((await screen.findByRole("alert")).textContent).toContain("찾을 수 없어요");
});
