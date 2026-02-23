import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for HomeIQ. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "February 23, 2026";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            App
          </a>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-bold text-gray-900">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated}
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              1. Information We Collect
            </h3>
            <p className="text-gray-700 leading-relaxed">
              When you use HomeIQ, we collect the following information:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                <strong>Account information:</strong> Name, email address, and
                profile image from your Google account when you sign in via
                OAuth.
              </li>
              <li>
                <strong>Financial inputs:</strong> Income, debts, savings, and
                location data you enter into the affordability calculator. These
                are used solely to generate your analysis and are not shared with
                third parties.
              </li>
              <li>
                <strong>Saved reports:</strong> If you choose to save a report,
                we store the analysis results linked to your account.
              </li>
              <li>
                <strong>Usage data:</strong> API request metadata (route,
                status, response time) for operational monitoring. This does not
                include your financial inputs.
              </li>
              <li>
                <strong>Feedback:</strong> Optional thumbs up/down ratings and
                comments you provide on analysis results.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              2. How We Use Your Information
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                Generate personalized home affordability analyses using AI
                agents.
              </li>
              <li>
                Store saved reports so you can access them across sessions.
              </li>
              <li>
                Monitor and improve service reliability and performance.
              </li>
              <li>
                Evaluate AI response quality to improve accuracy and safety.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              3. Third-Party Services
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We use the following third-party services to operate the
              application:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                <strong>Anthropic (Claude AI):</strong> Processes your financial
                inputs to generate analysis. Inputs are sent to the API but are
                not retained by Anthropic per their data usage policies.
              </li>
              <li>
                <strong>Google OAuth:</strong> Handles authentication. We
                receive your name, email, and profile image.
              </li>
              <li>
                <strong>Mapbox:</strong> Provides address autocomplete and
                geocoding. Address queries are sent to their API.
              </li>
              <li>
                <strong>Langfuse:</strong> Tracks AI generation quality metrics
                (token counts, latency). No PII is sent.
              </li>
              <li>
                <strong>Sentry:</strong> Captures application errors for
                debugging. Error context may include route paths but not
                financial data.
              </li>
              <li>
                <strong>Stripe:</strong> Processes subscription payments for Pro
                plans. We do not store credit card numbers; all payment data is
                handled by Stripe per their PCI-DSS compliance. We store only
                your Stripe customer ID.
              </li>
              <li>
                <strong>Realtor.com (via RapidAPI):</strong> Fetches matching
                property listings based on your location and budget. Location
                queries are sent to their API; no financial data is shared.
              </li>
              <li>
                <strong>Neon (PostgreSQL):</strong> Hosts our database. Data is
                encrypted in transit (TLS). See Section 6 for encryption at
                rest.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              4. Data Retention
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We retain data for the minimum period necessary:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                <strong>Saved reports:</strong> Retained until you delete them
                or delete your account.
              </li>
              <li>
                <strong>Usage events &amp; error logs:</strong> Automatically
                purged after 90 days.
              </li>
              <li>
                <strong>LLM cost records:</strong> Automatically purged after 90
                days.
              </li>
              <li>
                <strong>Feedback:</strong> Retained for up to 1 year, then
                purged.
              </li>
              <li>
                <strong>OAuth tokens:</strong> Stored encrypted. Revoked when
                you unlink your account.
              </li>
              <li>
                <strong>Subscription data:</strong> Stripe customer ID and plan
                tier are retained while your account is active. Deleted upon
                account deletion.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              5. Your Rights
            </h3>
            <p className="text-gray-700 leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                <strong>Access:</strong> View all data associated with your
                account via the Saved Reports page.
              </li>
              <li>
                <strong>Deletion:</strong> Delete individual saved reports at any
                time. To delete your entire account and all associated data,
                contact us at the email below.
              </li>
              <li>
                <strong>Portability:</strong> Export your reports as PDF from the
                results dashboard.
              </li>
              <li>
                <strong>Rectification:</strong> Re-run an analysis with corrected
                inputs at any time.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              6. Data Security
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We implement the following security measures:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                All data in transit is encrypted via TLS (HTTPS enforced with
                HSTS).
              </li>
              <li>
                Sensitive fields (OAuth tokens) are encrypted at rest using
                AES-256-GCM.
              </li>
              <li>
                Content Security Policy (CSP) headers prevent XSS and data
                injection.
              </li>
              <li>
                API inputs are validated with Zod schemas to prevent injection
                attacks.
              </li>
              <li>Rate limiting protects against abuse.</li>
              <li>
                Admin access is restricted to an allowlist of authorized emails.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              7. Cookies
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We use essential cookies only:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                <strong>Session cookie:</strong> A secure, HTTP-only JWT cookie
                for authentication. This is strictly necessary for the service
                to function when you sign in.
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              We do not use analytics cookies, advertising cookies, or
              third-party tracking cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              8. Children&apos;s Privacy
            </h3>
            <p className="text-gray-700 leading-relaxed">
              This service is not directed at children under 13. We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              9. Changes to This Policy
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will
              be posted on this page with an updated revision date. Continued
              use of the service after changes constitutes acceptance.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              10. Contact
            </h3>
            <p className="text-gray-700 leading-relaxed">
              For privacy-related questions or data deletion requests, contact
              us at:{" "}
              <a
                href="mailto:privacy@aicalculator.homes"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                privacy@aicalculator.homes
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
