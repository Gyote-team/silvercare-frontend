"use client";

import type { ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { TabBar } from "@/components/TabBar";

type Props = {
  children: ReactNode;
  tab?: string;
  chatLocked?: boolean;
  scrollClassName?: string;
  showTopbar?: boolean;
  userName?: string;
};

export function PhoneFrame({ children, tab, chatLocked, scrollClassName, showTopbar = true, userName }: Props) {
  return (
    <div className="phone">
      <div className="phone-screen">
        {showTopbar ? (
          <header className="app-topbar">
            {userName ? <NotificationMenu /> : null}
            <BrandLogo compact />
            {userName ? <AccountMenu userName={userName} /> : null}
          </header>
        ) : null}
        <div className={`screen-scroll ${scrollClassName ?? ""}`}>{children}</div>
        {tab ? <TabBar active={tab} chatLocked={chatLocked} /> : null}
      </div>
    </div>
  );
}
