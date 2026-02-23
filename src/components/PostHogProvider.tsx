"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";

function PostHogInit() {
  const ph = usePostHog();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastIdentifiedId = useRef<string | null>(null);

  // Identify authenticated users
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      const userId = session.user.id;
      if (lastIdentifiedId.current !== userId) {
        ph.identify(userId, {
          email: session.user.email ?? undefined,
          name: session.user.name ?? undefined,
          tier: (session.user as Record<string, unknown>).tier ?? "free",
        });
        lastIdentifiedId.current = userId;
      }
    } else if (status === "unauthenticated" && lastIdentifiedId.current) {
      ph.reset();
      lastIdentifiedId.current = null;
    }
  }, [ph, session, status]);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      const url = window.origin + pathname;
      const search = searchParams.toString();
      ph.capture("$pageview", {
        $current_url: search ? `${url}?${search}` : url,
      });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key) return;

    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      persistence: "localStorage+cookie",
      respect_dnt: true,
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogInit />
      </Suspense>
      {children}
    </PHProvider>
  );
}
