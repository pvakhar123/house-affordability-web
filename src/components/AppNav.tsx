"use client";

import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
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
    <a href="/" className="flex items-center gap-3 flex-shrink-0">
      <div className="relative flex-shrink-0 w-9 h-9">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl rotate-3 opacity-90" />
        <div className="relative w-full h-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M3.5 11L12 4l8.5 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9.5" cy="14.5" r="1" fill="currentColor" opacity="0.9" />
            <circle cx="14.5" cy="14.5" r="1" fill="currentColor" opacity="0.9" />
            <path d="M9.5 14.5c0 1.5 1.5 2.5 2.5 2.5s2.5-1 2.5-2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
            <path d="M17 3l.5 1.5L19 5l-1.5.5L17 7l-.5-1.5L15 5l1.5-.5L17 3z" fill="currentColor" opacity="0.8" />
          </svg>
        </div>
      </div>
      <div className="hidden sm:block">
        <span className="text-base font-bold text-gray-900">AI Home Research</span>
      </div>
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

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isAuthenticated = status === "authenticated";

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + nav links */}
          <div className="flex items-center gap-6">
            <Logo />

            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Theme toggle + auth */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isAuthenticated && (
              <>
                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
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
                onClick={() => signIn("google")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in
              </button>
            )}

            {status === "loading" && (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            )}
          </div>
        </div>

        {/* Mobile nav dropdown */}
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
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
