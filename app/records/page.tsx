"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useMe } from "@/lib/useMe";
import { ApiRequestError, createHealthRecord, fetchHealthRecords, type HealthRecord } from "@/lib/api";

function RecordsBody() {
  const { me, loading } = useMe();
  const params = useSearchParams();
  const [text, setText] = useState("");
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const patientId = params.get("patientId");

  useEffect(() => {
    if (!me) return;
    let active = true;
    setRecordsLoading(true);
    fetchHealthRecords(patientId ?? undefined)
      .then((items) => { if (active) setRecords(items); })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof ApiRequestError && error.status === 403
          ? "이 개인의 기록을 볼 권한이 없습니다."
          : "건강 기록을 불러오지 못했습니다.");
      })
      .finally(() => { if (active) setRecordsLoading(false); });
    return () => { active = false; };
  }, [me, patientId]);

  async function saveRecord() {
    if (!text.trim() || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const created = await createHealthRecord({
        patientId: patientId ?? undefined,
        inputType: "TEXT",
        content: text,
        idempotencyKey: crypto.randomUUID()
      });
      setRecords((previous) => [created, ...previous]);
      setText("");
      setMessage("기록을 저장했습니다.");
    } catch {
      setMessage("기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !me) {
    return <PhoneFrame tab="records"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  }

  const viewingOwnProfile = !patientId || patientId === me.patientId;
  const targetName = params.get("name") ?? (viewingOwnProfile ? me.name : "연결된 개인");

  return (
    <PhoneFrame tab="records" userName={me.name}>
      <div className="page-title">{viewingOwnProfile ? "내 건강 상태 기록" : `${targetName} 님 건강 상태 기록`}</div>
      <p className="page-sub">{viewingOwnProfile ? "내 몸 상태를 간단히 남겨주세요. AI가 진료 전 요약에 반영해요." : `${targetName} 님의 상태를 보호자 기록으로 남겨요.`}</p>
      <p className="tag">{viewingOwnProfile ? `내가 작성 · ${me.name}` : `보호자 작성 · ${targetName} 님`}</p>
      <textarea className="record-area" value={text} onChange={(event) => setText(event.target.value)} />
      <div className="quick-tags">
        {["🦵 무릎 불편", "💊 복약 완료", "😴 수면 상태", "🍚 식사량"].map((tag) => (
          <button key={tag} className="quick-tag" type="button" onClick={() => setText((prev) => `${prev} ${tag}`)}>
            {tag}
          </button>
        ))}
      </div>
      <p className="hint">🎙️ 음성 입력은 다음 단계(Advanced)에서 지원 예정 — MVP는 텍스트 기록만 다룹니다.</p>
      <button className="btn-primary" type="button" disabled={!text.trim() || saving} onClick={saveRecord}>
        {saving ? "저장 중…" : viewingOwnProfile ? "내 기록 저장하기" : "보호자 기록 저장하기"}
      </button>
      <p className="hint" style={{ textAlign: "center" }}>이 기록은 특정 방문(Visit)에 연결되지 않아도 저장돼요.</p>
      {message ? <p className="hint" style={{ textAlign: "center" }}>{message}</p> : null}
      <div className="section-label"><span>{viewingOwnProfile ? "내 최근 기록" : `${targetName} 님 최근 기록`}</span><span>더보기 ›</span></div>
      <div className="card" style={{ padding: "4px 16px" }}>
        {recordsLoading ? <p className="page-sub">기록을 불러오는 중…</p> : null}
        {!recordsLoading && records.length === 0 ? <p className="page-sub">아직 남긴 기록이 없어요.</p> : null}
        {records.map((record) => <div className="past-entry" key={record.id}>
          <div className="dot" /><div className="txt"><b>{record.content}</b><span>{new Date(record.recordedAt).toLocaleDateString("ko-KR")} · {record.authorName} 작성</span></div>
        </div>)}
      </div>
    </PhoneFrame>
  );
}

export default function RecordsPage() {
  return (
    <Suspense>
      <RecordsBody />
    </Suspense>
  );
}
