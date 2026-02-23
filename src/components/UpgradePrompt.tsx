"use client";

import { signIn } from "next-auth/react";

interface UpgradePromptProps {
  message: string;
  requiresAuth?: boolean;
  onDismiss: () => void;
}

export default function UpgradePrompt({ message, requiresAuth, onDismiss }: UpgradePromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-5">
        {/* Icon */}
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,149,0,0.12)" }}>
            <svg className="w-6 h-6" style={{ color: "#ff9500" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {requiresAuth ? "Sign in to continue" : "Usage limit reached"}
          </h3>
          <p className="text-sm text-gray-600 mt-2">{message}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {requiresAuth ? (
            <button
              onClick={() => signIn("google")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-full transition-colors"
              style={{ background: "#0071e3" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          ) : (
            <a
              href="/pricing"
              className="w-full flex items-center justify-center px-4 py-2.5 text-white text-sm font-medium rounded-full transition-colors"
              style={{ background: "linear-gradient(to right, #0071e3, #5856d6)" }}
            >
              View Pro Plans
            </a>
          )}
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
