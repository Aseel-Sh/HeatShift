import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeatShift — وردية آمنة",
  description:
    "Planning guidance for safer outdoor shift preparation in Saudi Arabia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
