// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PrevisitPage from "./page";

const mocks = vi.hoisted(() => ({ api: vi.fn(), me: { id: "care-a", name: "가상 보호자", role: "CAREGIVER" } }));
vi.mock("@/lib/useMe", () => ({ useMe: () => ({ me: mocks.me, loading: false }) }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/components/PhoneFrame", () => ({ PhoneFrame: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/PrevisitSummaryPanel", () => ({ PrevisitSummaryPanel: ({ userId, patientId }: { userId: string; patientId?: string }) => <div data-testid="summary-target">{userId}:{patientId ?? "self"}</div> }));

beforeEach(() => {
  mocks.me = { id: "care-a", name: "가상 보호자", role: "CAREGIVER" };
  mocks.api.mockReset();
  mocks.api.mockResolvedValueOnce([{ id: "link-a", patientId: "patient-a", status: "ACTIVE", counterpartName: "가상 개인" }]);
});
afterEach(cleanup);

it("보호자 계정이 바뀌면 새 연결을 확인하기 전 이전 대상을 숨긴다", async () => {
  const view = render(<PrevisitPage />);
  await waitFor(() => expect(screen.getByTestId("summary-target").textContent).toBe("care-a:patient-a"));
  mocks.api.mockImplementationOnce(() => new Promise(() => {}));
  mocks.me = { ...mocks.me, id: "care-b" };
  view.rerender(<PrevisitPage />);
  expect(screen.queryByTestId("summary-target")).toBeNull();
});

it("보호자에서 개인으로 전환하면 이전 보호 대상 대신 본인만 선택한다", async () => {
  const view = render(<PrevisitPage />);
  await screen.findByTestId("summary-target");
  mocks.me = { id: "person-b", name: "가상 개인", role: "PATIENT" };
  view.rerender(<PrevisitPage />);
  await waitFor(() => expect(screen.getByTestId("summary-target").textContent).toBe("person-b:self"));
});
