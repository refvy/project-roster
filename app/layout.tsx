import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import { getAppUrl } from "@/lib/env";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const title = "Skwad — matchday board";
const description =
  "Paste-link matchday board for recreational sports groups. Players RSVP in under a minute.";

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  applicationName: "Skwad",
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "Skwad",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream font-sans font-normal text-ink">
        {children}
      </body>
    </html>
  );
}
