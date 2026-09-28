import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: NO_INDEX_ROBOTS,
};

export default function MatchLayout({ children }: { children: ReactNode }) {
  return children;
}
