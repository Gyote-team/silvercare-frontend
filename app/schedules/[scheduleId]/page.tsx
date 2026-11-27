import { ScheduleEditor } from "@/components/ScheduleEditor";
export default async function ScheduleDetailPage({ params }: { params: Promise<{ scheduleId: string }> }) { const { scheduleId } = await params; return <ScheduleEditor id={scheduleId} />; }
