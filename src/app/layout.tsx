import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Angelito | Personal Website",
  description: "Personal website and online selling page.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
