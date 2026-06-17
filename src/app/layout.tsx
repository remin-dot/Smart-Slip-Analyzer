import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Slip Analyzer",
  description: "AI personal finance assistant for bank slip scanning and spending analytics."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
