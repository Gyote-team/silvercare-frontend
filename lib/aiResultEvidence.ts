import type { AiResultEvidence } from "./api";

type StoredSentence = { citation_ids?: string[]; citationIds?: string[] };
type StoredSource = {
  citation_id?: string;
  citationId?: string;
  document_id?: string | null;
  documentId?: string | null;
  page_no?: number | null;
  pageNo?: number | null;
  label?: string | null;
  source_text?: string | null;
  sourceText?: string | null;
  value?: string | null;
  unit?: string | null;
};

/** Spring이 저장한 인용 JSON에서 답변 문장이 실제로 사용한 원문만 꺼낸다. */
export function citedEvidence(citationJson: string | null): AiResultEvidence[] {
  if (!citationJson) return [];

  const parsed = JSON.parse(citationJson) as {
    sentences?: StoredSentence[];
    sources?: StoredSource[];
  } | null;
  if (!parsed || !Array.isArray(parsed.sentences) || !Array.isArray(parsed.sources)) return [];

  const citedIds = new Set(parsed.sentences.flatMap((sentence) =>
    sentence.citation_ids ?? sentence.citationIds ?? []
  ));
  return parsed.sources.flatMap((source) => {
    const citationId = source.citation_id ?? source.citationId;
    if (!citationId || !citedIds.has(citationId)) return [];
    return [{
      citationId,
      documentId: source.document_id ?? source.documentId ?? null,
      pageNo: source.page_no ?? source.pageNo ?? null,
      label: source.label ?? null,
      sourceText: source.source_text ?? source.sourceText ?? null,
      value: source.value ?? null,
      unit: source.unit ?? null
    }];
  });
}
