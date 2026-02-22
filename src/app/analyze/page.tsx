import type { Metadata } from "next";
import { Suspense } from "react";
import AnalyzeClient from "./AnalyzeClient";

export const metadata: Metadata = {
  title: "New Analysis – AI Home Research",
  description: "Run a free AI-powered home affordability analysis with real-time mortgage rates, risk assessment, and personalized recommendations.",
};

export default function AnalyzePage() {
  return (
    <Suspense>
      <AnalyzeClient />
    </Suspense>
  );
}
