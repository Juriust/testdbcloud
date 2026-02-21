import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo Tracker",
  description: "Mini app for testing cloud PostgreSQL with Prisma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
