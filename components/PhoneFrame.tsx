"use client";

import type { ReactNode } from "react";
import { TabBar } from "@/components/TabBar";

type Props = {
  children: ReactNode;
  tab?: string;
  chatLocked?: boolean;
  scrollClassName?: string;
};

export function PhoneFrame({ children, tab, chatLocked, scrollClassName }: Props) {
  return (
    <div className="phone">
      <div className="phone-screen">
        <div className="notch" aria-hidden="true" />
        <div className="statusbar">
          <span>9:41</span>
          <span>🔋 100%</span>
        </div>
        <div className={`screen-scroll ${scrollClassName ?? ""}`}>{children}</div>
        {tab ? <TabBar active={tab} chatLocked={chatLocked} /> : null}
      </div>
    </div>
  );
}
