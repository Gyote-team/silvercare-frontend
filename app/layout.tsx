import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SilverCare AI",
  description: "개인과 보호자가 함께 잇는 건강기록",
  icons: {
    icon: "/brand/favicon-blue.png",
    shortcut: "/brand/favicon-blue.png",
    apple: "/brand/favicon-blue.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
