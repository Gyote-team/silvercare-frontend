"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PrevisitSummaryPanel } from "@/components/PrevisitSummaryPanel";
import { api, type CareRelation } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import "./previsit.css";

export default function PrevisitPage() {
  const { me, loading } = useMe();
  const [targets, setTargets] = useState<CareRelation[]>([]);
  const [patientId, setPatientId] = useState("");
  const [readyFor, setReadyFor] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!me) return;
    setMessage("");
    if (me.role !== "CAREGIVER") {
      setTargets([]); setPatientId(""); setReadyFor(me.id); return;
    }
    const controller = new AbortController();
    api<CareRelation[]>("/api/care-relations", { signal: controller.signal }).then(rows => {
      if (controller.signal.aborted) return;
      const active = rows.filter(row => row.status === "ACTIVE");
      setTargets(active); setPatientId(active.length === 1 ? active[0].patientId : ""); setReadyFor(me.id);
    }).catch(() => { if (!controller.signal.aborted) setMessage("연결된 개인을 불러오지 못했어요. 새로고침해 주세요."); });
    return () => controller.abort();
  }, [me]);
  const ready = !!me && readyFor === me.id;
  return <PhoneFrame tab="home" userName={me?.name} scrollClassName="previsit-screen">
    <Link href="/home" className="previsit-back">‹ 홈으로</Link>
    <header><span className="previsit-eyebrow">진료를 준비하는 작은 정리</span><h1>진료 전 요약</h1>
      <p>흩어져 있던 건강기록을 모아<br />의료진에게 전할 내용을 확인해요.</p></header>
    {loading && <p>불러오는 중…</p>}
    {message && <p role="alert">{message}</p>}
    {me?.role === "CAREGIVER" && ready && <section className="previsit-card">
      <label htmlFor="previsit-patient">요약할 개인</label>
      <select id="previsit-patient" value={patientId} onChange={e => setPatientId(e.target.value)}>
        <option value="">개인을 선택해 주세요</option>
        {targets.map(row => <option key={row.id} value={row.patientId}>{row.counterpartName}</option>)}
      </select>
      {!targets.length && <p>연결된 개인이 없어요. 홈에서 개인과 연결한 뒤 이용해 주세요.</p>}
    </section>}
    {me && ready && (me.role === "PATIENT" || !!patientId) &&
      <PrevisitSummaryPanel key={`${me.id}:${me.role === "CAREGIVER" ? patientId : "self"}`} userId={me.id} patientId={me.role === "CAREGIVER" ? patientId : undefined} />}
  </PhoneFrame>;
}
