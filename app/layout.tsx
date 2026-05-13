import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mail-sequence",
  description: "Email drip sequence service",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap"
        />
      </head>
      <body className="font-sans bg-[#f6f6f6] text-navy">{children}</body>
    </html>
  );
}
