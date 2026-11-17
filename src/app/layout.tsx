import type { Metadata } from "next";
// Pretendard 공식 동적 서브셋 — 화면에 나오는 글자 조각만 같은 출처에서 받는다 (ADR 0031)
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "향수가 사람이라면?",
  description: "향수를 사람에 비유한 재미있는 시향기를 쓰고 나누는 곳",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
