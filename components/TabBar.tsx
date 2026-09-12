"use client";

import Link from "next/link";

const tabs = [
  { href: "/home", id: "home", icon: "🏠", label: "홈" },
  { href: "/records", id: "records", icon: "📝", label: "건강기록" },
  { href: "/documents", id: "documents", icon: "📄", label: "문서함" },
  { href: "/timeline", id: "timeline", icon: "🗂️", label: "타임라인" },
  { href: "/chat", id: "chat", icon: "💬", label: "AI채팅" }
] as const;

export function TabBar({ active, chatLocked }: { active: string; chatLocked?: boolean }) {
  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`tab-btn${active === tab.id ? " active" : ""}`}
        >
          <span className="tab-icon">{tab.id === "chat" && chatLocked ? "🔒" : tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
