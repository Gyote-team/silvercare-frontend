import { describe, expect, it } from "vitest";
import { citedEvidence } from "./aiResultEvidence";

describe("저장된 AI 답변의 원문 근거", () => {
  it("Spring의 snake_case 인용 JSON에서 사용된 근거만 표시한다", () => {
    const result = citedEvidence(JSON.stringify({
      sentences: [{ text: "검사 수치 설명", citation_ids: ["used"] }],
      sources: [
        { citation_id: "used", document_id: "doc-1", page_no: 2, source_text: "HbA1c 6.5%" },
        { citation_id: "unused", document_id: "doc-2", page_no: 3, source_text: "다른 문서" }
      ]
    }));

    expect(result).toEqual([{
      citationId: "used",
      documentId: "doc-1",
      pageNo: 2,
      label: null,
      sourceText: "HbA1c 6.5%",
      value: null,
      unit: null
    }]);
  });

  it("인용한 문장이 없으면 근거 목록을 노출하지 않는다", () => {
    expect(citedEvidence(JSON.stringify({
      sentences: [{ text: "근거 없음", citation_ids: [] }],
      sources: [{ citation_id: "unused", document_id: "doc-1" }]
    }))).toEqual([]);
  });

  it("이전 camelCase 인용 JSON도 읽는다", () => {
    expect(citedEvidence(JSON.stringify({
      sentences: [{ citationIds: ["used"] }],
      sources: [{ citationId: "used", documentId: "doc-1", pageNo: 1 }]
    }))).toMatchObject([{ citationId: "used", documentId: "doc-1", pageNo: 1 }]);
  });
});
