"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import "./NotificationMenu.css";

type Notice = { id: string; type: string; message: string; path: string; createdAt: string; readAt: string | null };
type Notices = { items: Notice[]; unreadCount: number };
export function NotificationMenu() {
  const router = useRouter();
  const [open,setOpen]=useState(false);
  const [data,setData]=useState<Notices | null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let active=true;
    async function refresh() {
      try { const result=await api<Notices>("/api/notifications"); if(active) {setData(result);setError("");} }
      catch {if(active) setError("알림을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.");}
    }
    refresh();
    const timer=setInterval(refresh,15000);
    function focus() { refresh(); }
    window.addEventListener("focus",focus);
    return ()=>{active=false;clearInterval(timer);window.removeEventListener("focus",focus);};
  },[open]);
  useEffect(()=>{
    if(!open) return;
    function outside(event:PointerEvent) {if(root.current&&!root.current.contains(event.target as Node)) setOpen(false);}
    function escape(event:KeyboardEvent) {if(event.key==="Escape") setOpen(false);}
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[open]);
  async function read(notice:Notice) {
    if(busy) return;
    setBusy(true);
    try {
      if(!notice.readAt) await api<void>(`/api/notifications/${notice.id}/read`,{method:"PATCH"});
      setData(current=>current?{items:current.items.map(row=>row.id===notice.id?{...row,readAt:new Date().toISOString()}:row),
        unreadCount:Math.max(0,current.unreadCount-(notice.readAt?0:1))}:current);
      setOpen(false);router.push(notice.path);
    } catch {setError("읽음 처리하지 못했습니다. 다시 시도해 주세요.");}
    finally {setBusy(false);}
  }
  async function readAll() {
    setBusy(true);
    try {
      await api<void>("/api/notifications/read-all",{method:"PATCH"});
      setData(current=>current?{unreadCount:0,items:current.items.map(row=>({...row,readAt:row.readAt??new Date().toISOString()}))}:current);
      setError("");
    } catch {setError("읽음 처리하지 못했습니다. 다시 시도해 주세요.");}
    finally {setBusy(false);}
  }
  return <div className="notification-root" ref={root}>
    <button className="notification-bell" type="button" aria-label={`알림${data?.unreadCount?` · 읽지 않은 알림 ${data.unreadCount}개`:""}`}
      aria-expanded={open} aria-controls="notification-panel" onClick={()=>setOpen(value=>!value)}>
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
      {!!data?.unreadCount&&<span className="notification-badge">{data.unreadCount>99?"99+":data.unreadCount}</span>}
    </button>
    {open&&<section className="notification-panel" id="notification-panel" aria-label="시스템 알림">
      <header><div><strong>알림</strong><span>연결과 건강기록 소식</span></div>
        <button type="button" disabled={busy||!data?.unreadCount} onClick={readAll}>모두 읽음</button></header>
      {error&&<p className="notification-error" role="status">{error}</p>}
      {!data&&!error&&<p className="notification-empty">알림을 불러오는 중…</p>}
      {data?.items.length===0&&!error&&<div className="notification-empty"><strong>아직 새로운 소식이 없어요</strong><p>연결 요청이나 보호자가 작성한 기록이<br/>여기에 표시돼요.</p></div>}
      <div className="notification-list">{data?.items.map(notice=><button key={notice.id} type="button"
        className={`notification-item${notice.readAt?"":" unread"}`} disabled={busy} onClick={()=>read(notice)}>
        <span className="notification-symbol" aria-hidden="true">{notice.type.startsWith("RELATION_")?"↔":"✎"}</span>
        <span className="notification-copy"><span>{notice.message}</span><time dateTime={notice.createdAt}>{new Date(notice.createdAt).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time></span>
        {!notice.readAt&&<span className="notification-dot" aria-label="읽지 않음"/>}
      </button>)}</div>
    </section>}
  </div>;
}
