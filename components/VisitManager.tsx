"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { VisitForm } from "@/components/VisitForm";
import { useMe } from "@/lib/useMe";
import { api, type CareRelation } from "@/lib/api";
import { type VisitPage, type VisitInput, type VisitFilter, visitDateLabel, visitError, visitListPath, visitStatusLabel, writeVisit } from "@/lib/visits";
import "@/app/visits/visits.css";

const emptyPage: VisitPage = { items: [], nextCursor: null, hasNext: false };

export function VisitManager() {
  const { me, loading } = useMe();
  const caregiver = me?.role === "CAREGIVER";
  const [targets, setTargets] = useState<CareRelation[]>([]);
  const [target, setTarget] = useState("");
  const [ready, setReady] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [targetReload, setTargetReload] = useState(0);
  const [page, setPage] = useState(emptyPage);
  const [filter, setFilter] = useState<VisitFilter>("ACTIVE");
  const [fetching, setFetching] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const canManage = ready && (me?.role === "PATIENT" || (caregiver && !!target));
  const targetName = caregiver ? targets.find(row => row.patientId === target)?.counterpartName : me?.name;

  useEffect(() => {
    if (!me) return;
    if (!caregiver) { setReady(true); return; }
    const controller = new AbortController();
    setTargetError(""); setReady(false);
    api<CareRelation[]>("/api/care-relations", { signal: controller.signal }).then(rows => {
      if (controller.signal.aborted) return;
      const active = [...new Map(rows.filter(row => row.status === "ACTIVE").map(row => [row.patientId, row])).values()];
      setTargets(active);
      const stored = sessionStorage.getItem(`visits-target:${me.id}`);
      setTarget(active.some(row => row.patientId === stored) ? stored! : active[0]?.patientId ?? "");
      setReady(true);
    }).catch(reason => { if (!controller.signal.aborted) setTargetError(visitError(reason)); });
    return () => controller.abort();
  }, [me, caregiver, targetReload]);

  useEffect(() => {
    const token = ++generation.current;
    const controller = new AbortController();
    setPage(emptyPage); setLoaded(false); setError(""); setFetching(false);
    if (!canManage) return;
    if (caregiver && me) sessionStorage.setItem(`visits-target:${me.id}`, target);
    setFetching(true);
    api<VisitPage>(visitListPath(caregiver ? target : undefined, filter), { signal: controller.signal }).then(result => {
      if (token === generation.current) { setPage(result); setLoaded(true); }
    }).catch(reason => { if (token === generation.current && !controller.signal.aborted) setError(visitError(reason)); })
      .finally(() => { if (token === generation.current) setFetching(false); });
    return () => { controller.abort(); ++generation.current; };
  }, [canManage, caregiver, me, target, filter, reload]);

  function changeTarget(next: string) {
    if (next === target || busy) return;
    if (dirty && !window.confirm("작성 중인 방문 정보가 있어요. 내용을 지우고 다른 개인으로 전환할까요?")) return;
    ++generation.current; setPage(emptyPage); setLoaded(false); setError(""); setMessage("");
    setDirty(false); setFormKey(value => value + 1); setTarget(next);
  }
  async function save(input: VisitInput) {
    if (busy || !canManage) return;
    setBusy(true); setMessage(""); setError("");
    try {
      await writeVisit(input);
      setDirty(false); setFormKey(value => value + 1); setMessage("방문을 등록했어요."); setReload(value => value + 1);
    } catch (reason) { setError(visitError(reason)); }
    finally { setBusy(false); }
  }
  async function loadMore() {
    if (busy || fetching || !page.nextCursor) return;
    const token = generation.current; setFetching(true);
    try {
      const result = await api<VisitPage>(visitListPath(caregiver ? target : undefined, filter, page.nextCursor));
      if (token === generation.current) setPage(current => ({ ...result, items: [...current.items, ...result.items] }));
    } catch (reason) { if (token === generation.current) setError(visitError(reason)); }
    finally { if (token === generation.current) setFetching(false); }
  }
  if (loading || !me) return <PhoneFrame tab="timeline"><p className="page-sub">불러오는 중…</p></PhoneFrame>;
  return <PhoneFrame tab="timeline" userName={me.name} chatLocked={caregiver} scrollClassName="visits-screen">
    <header className="visits-heading"><span>차곡차곡 쌓이는 진료 이력</span><h1>병원 방문</h1><p>진료 예정부터 지난 방문까지, 한곳에서 관리해요.</p></header>
    {caregiver ? <section className="visit-target card"><label htmlFor="visit-patient">관리할 개인</label>
      <select id="visit-patient" value={target} disabled={busy || !ready} onChange={event => changeTarget(event.target.value)}>
        {!targets.length && <option value="">연결된 개인이 없습니다</option>}
        {targets.map(row => <option key={row.patientId} value={row.patientId}>{row.counterpartName}</option>)}
      </select>
      {targetError && <><p role="alert">{targetError}</p><button className="btn-out" onClick={() => setTargetReload(value => value + 1)}>연결 목록 다시 불러오기</button></>}
      {ready && !targets.length && <p>개인과 연결한 뒤 방문을 관리할 수 있어요. 본인 방문은 개인 계정으로 전환해 주세요.</p>}
    </section> : <p className="visit-owner">{me.name} 님의 방문 · 보호자 없이도 관리할 수 있어요.</p>}
    {canManage && <><p className="visit-context">{targetName} 님의 방문을 관리하고 있어요.</p>
      <VisitForm key={`${me.id}:${target}:${formKey}`} patientId={caregiver ? target : undefined} disabled={busy || fetching} pending={busy} onSave={save} onDirty={setDirty} /></>}
    {message && <p className="visit-success" role="status">{message}</p>}
    <div className="visit-list-heading"><h2>방문 목록</h2><label>방문 상태 <select aria-label="방문 상태 필터" value={filter} disabled={busy} onChange={event => setFilter(event.target.value as VisitFilter)}>
      <option value="ACTIVE">예정·완료</option><option value="ALL">전체</option><option value="SCHEDULED">방문 예정</option><option value="DONE">방문 완료</option><option value="CANCELED">취소된 방문</option>
    </select></label></div>
    {error && <div className="visit-error" role="alert"><p>{error}</p><button className="btn-out" disabled={busy || fetching} onClick={() => setReload(value => value + 1)}>목록 다시 불러오기</button></div>}
    {fetching && !page.items.length && <p role="status">방문을 불러오는 중…</p>}
    {canManage && loaded && !page.items.length && <section className="visit-empty"><strong>선택한 상태의 방문이 없어요</strong><p>다른 상태를 선택하거나 위에서 새 방문을 등록해 보세요.</p></section>}
    <div className="visit-list">{page.items.map(visit => <Link key={visit.visitId} href={`/visits/${visit.visitId}`} className={`visit-list-card ${visit.visitStatus.toLowerCase()}`}>
      <div><span className={`visit-status ${visit.visitStatus.toLowerCase()}`}>{visitStatusLabel[visit.visitStatus]}</span><span className="visit-arrow" aria-hidden="true">›</span></div>
      <h3>{visit.hospitalName || "병원명 미입력"}{visit.department && <span> · {visit.department}</span>}</h3>
      <p className="visit-date">{visitDateLabel(visit.visitedOn)}</p>
      {visit.memo && <p className="visit-preview">{visit.memo}</p>}
      <div className="visit-reference-count"><span>서류 {visit.documentIds.length}건</span><span>건강기록 {visit.healthRecordIds.length}건</span></div>
    </Link>)}</div>
    {page.hasNext && <button className="btn-out" disabled={busy || fetching} onClick={loadMore}>{fetching ? "불러오는 중…" : "방문 더 불러오기"}</button>}
  </PhoneFrame>;
}
