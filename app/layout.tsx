import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SilverCare AI",
  description: "개인과 보호자가 함께 잇는 건강기록"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
