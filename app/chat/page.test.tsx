// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatPage from "./page";

const mocks = vi.hoisted(() => ({
  askAiChat: vi.fn(),
  fetchAiChatMessages: vi.fn()
}));

const patient = { id: "patient-1", name: "환자", role: "PATIENT" };
const rooms = [
  { sessionId: "room-a", patientId: "patient-1", title: "새 채팅", createdAt: "2026-10-16T10:00:00Z" },
  { sessionId: "room-b", patientId: "patient-1", title: "B방", createdAt: "2026-10-16T09:00:00Z" }
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams()
}));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("@/components/PhoneFrame", () => ({ PhoneFrame: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/lib/useMe", () => ({ useMe: () => ({ me: patient, loading: false }) }));
vi.mock("@/lib/api", () => ({
  ApiRequestError: class ApiRequestError extends Error {},
  api: vi.fn(),
  askAiChat: mocks.askAiChat,
  createAiChatSession: vi.fn(),
  fetchAiChatMessages: mocks.fetchAiChatMessages,
  fetchAiChatSessions: vi.fn(async () => rooms),
  fetchAiResultDocument: vi.fn(),
  fetchMedicalDocuments: vi.fn(async () => ({ items: [{ documentId: "doc-1", documentName: "검사 결과", documentStatus: "COMPLETED" }] }))
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("채팅방 전환 중 답변 도착", () => {
  it("A방 응답이 늦게 와도 선택한 B방의 제목과 메시지를 유지한다", async () => {
    let finishA!: (messages: Array<{ messageId: string; role: string; content: string; createdAt: string }>) => void;
    mocks.askAiChat.mockImplementation(() => new Promise((resolve) => { finishA = resolve; }));
    mocks.fetchAiChatMessages.mockImplementation(async (sessionId: string) => sessionId === "room-b"
      ? [{ messageId: "b-1", role: "ASSISTANT", content: "B방 답변", createdAt: "2026-10-16T10:00:00Z" }]
      : []);

    render(<ChatPage />);
    fireEvent.click((await screen.findByText("새 채팅", { selector: "strong" })).closest("button")!);
    fireEvent.change(screen.getByPlaceholderText("더 자세한 질문을 남겨 주세요…"), { target: { value: "A방 질문" } });
    fireEvent.click(screen.getByRole("button", { name: "질문 보내기" }));
    await waitFor(() => expect(mocks.askAiChat).toHaveBeenCalledWith("room-a", "A방 질문", "DOCUMENT_EASY_EXPLANATION", ["doc-1"]));

    fireEvent.click(screen.getByRole("button", { name: "‹ 목록" }));
    fireEvent.click(screen.getByRole("button", { name: /B방/ }));
    expect(await screen.findByText("B방 답변")).toBeTruthy();

    finishA([{ messageId: "a-1", role: "ASSISTANT", content: "A방 답변", createdAt: "2026-10-16T10:01:00Z" }]);
    await waitFor(() => expect(screen.queryByText("원문 근거를 확인하며 답변을 만들고 있어요…")).toBeNull());
    expect(screen.getByText("B방 답변")).toBeTruthy();
    expect(screen.queryByText("A방 답변")).toBeNull();
    expect(screen.getByText("B방")).toBeTruthy();
  });
});
