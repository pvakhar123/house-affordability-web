import type { Metadata } from "next";
import { Suspense } from "react";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing – AI Home Research",
  description: "Compare Free and Pro plans for AI Home Research. Get more reports, unlimited chat, and unlimited saved reports with Pro.",
};

export default function PricingPage() {
  return (
    <Suspense>
      <PricingClient />
    </Suspense>
  );
}
