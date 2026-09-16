import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Roster — matchday board",
  description:
    "Paste-link matchday board for recreational sports groups. Players RSVP in under a minute.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream font-sans text-ink">{children}</body>
    </html>
  );
}
