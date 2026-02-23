"use client";

import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/analyze", label: "New Analysis" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5 flex-shrink-0">
      <div className="relative flex-shrink-0 w-8 h-8">
        <div className="relative w-full h-full rounded-xl flex items-center justify-center" style={{ background: "#0071e3" }}>
          <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M3 12l9-8 9 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 11v8a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <span className="text-sm font-semibold text-gray-900 tracking-tight">Home<span style={{ color: "#0071e3" }}>IQ</span></span>
    </a>
  );
}

export default function AppNav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const posthog = usePostHog();
  const isAuthenticated = status === "authenticated";

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-6">
            <Logo />

            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-0.5">
                {navLinks.map((link) => {
                  const isActive = link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                        isActive
                          ? "bg-gray-100 text-gray-900 font-semibold"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isAuthenticated && (
              <>
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                  aria-label="Toggle menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {mobileOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    )}
                  </svg>
                </button>
                <UserMenu />
              </>
            )}

            {status === "unauthenticated" && (
              <button
                onClick={() => { posthog.capture("sign_in_clicked", { location: "nav" }); signIn("google"); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in
              </button>
            )}

            {status === "loading" && (
              <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
            )}
          </div>
        </div>

        {isAuthenticated && mobileOpen && (
          <div ref={mobileRef} className="md:hidden border-t border-gray-100 py-2 pb-3">
            {navLinks.map((link) => {
              const isActive = link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900 font-semibold"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
