import { CandidateDetail } from "@/components/CandidateDetail";
export default async function CandidateDetailPage({ params }: { params: Promise<{ actionItemId: string }> }) {
  const { actionItemId } = await params;
  return <CandidateDetail actionItemId={actionItemId} />;
}
