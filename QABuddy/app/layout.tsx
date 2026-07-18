import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QABuddy.ai — Multi-Source Hybrid RAG for QA Engineers",
  description: "Ask one question, get a cited answer grounded in your QA knowledge base — Selenium, Playwright, test cases, JIRA, PRDs, and Jenkins logs.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-terminal-bg">{children}</body>
    </html>
  );
}
