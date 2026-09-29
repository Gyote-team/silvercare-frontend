"use client";

import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { TabBar } from "@/components/TabBar";

type Props = {
  children: ReactNode;
  tab?: string;
  chatLocked?: boolean;
  scrollClassName?: string;
  showTopbar?: boolean;
};

export function PhoneFrame({ children, tab, chatLocked, scrollClassName, showTopbar = true }: Props) {
  return (
    <div className="phone">
      <div className="phone-screen">
        {showTopbar ? (
          <header className="app-topbar">
            <BrandLogo compact />
          </header>
        ) : null}
        <div className={`screen-scroll ${scrollClassName ?? ""}`}>{children}</div>
        {tab ? <TabBar active={tab} chatLocked={chatLocked} /> : null}
      </div>
    </div>
  );
}
