import type { Metadata } from "next";
import { Suspense } from "react";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing – HomeIQ",
  description: "Compare Free and Pro plans for HomeIQ. Get more reports, unlimited chat, and unlimited saved reports with Pro.",
};

export default function PricingPage() {
  return (
    <Suspense>
      <PricingClient />
    </Suspense>
  );
}
