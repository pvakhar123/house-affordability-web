import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for AI Home Research. Understand the rules and guidelines for using our service.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "February 22, 2026";

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
          <h1 className="text-sm font-bold text-gray-900">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Terms of Service
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated}
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              1. Acceptance of Terms
            </h3>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using AI Home Research (&quot;the Service&quot;),
              you agree to be bound by these Terms of Service. If you do not
              agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              2. Description of Service
            </h3>
            <p className="text-gray-700 leading-relaxed">
              AI Home Research is a free, AI-powered home affordability
              calculator that provides personalized financial analysis using
              real-time mortgage rates, market data, and risk assessment. The
              Service uses multiple AI agents to generate reports and answer
              questions about home buying.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              3. Not Financial Advice
            </h3>
            <p className="text-gray-700 leading-relaxed font-medium text-amber-800 bg-amber-50 p-4 rounded-lg border border-amber-200">
              The Service provides informational analysis only and does NOT
              constitute financial, investment, legal, or tax advice. Always
              consult a qualified financial advisor, mortgage professional, or
              real estate attorney before making home buying decisions. AI
              outputs may contain errors or outdated information.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              4. User Accounts
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                You may sign in with Google OAuth to save reports and access
                personalized features.
              </li>
              <li>
                You are responsible for maintaining the security of your Google
                account.
              </li>
              <li>
                You must not share your account or allow unauthorized access.
              </li>
              <li>
                We reserve the right to suspend or terminate accounts that
                violate these Terms.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              5. Acceptable Use
            </h3>
            <p className="text-gray-700 leading-relaxed">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                Use the Service for any unlawful purpose or in violation of any
                applicable laws.
              </li>
              <li>
                Attempt to reverse-engineer, decompile, or extract source code
                from the Service.
              </li>
              <li>
                Abuse API endpoints through excessive automated requests beyond
                normal use.
              </li>
              <li>
                Submit false, misleading, or malicious data to the Service.
              </li>
              <li>
                Scrape, crawl, or harvest data from the Service for commercial
                purposes.
              </li>
              <li>
                Impersonate another person or misrepresent your affiliation.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              6. Intellectual Property
            </h3>
            <p className="text-gray-700 leading-relaxed">
              The Service, including its design, code, AI models, and content,
              is the property of AI Home Research. Reports generated for you are
              yours to use, share, and export. You may not redistribute the
              Service itself or create derivative services.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              7. Data &amp; Privacy
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Your use of the Service is also governed by our{" "}
              <a
                href="/privacy"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Privacy Policy
              </a>
              , which describes how we collect, use, and protect your
              information. By using the Service, you consent to the data
              practices described therein.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              8. AI-Generated Content
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1.5">
              <li>
                Analysis results are generated by AI and may not be 100%
                accurate.
              </li>
              <li>
                Mortgage rates, market data, and property values are estimates
                and may differ from actual figures.
              </li>
              <li>
                We do not guarantee the accuracy, completeness, or timeliness
                of any AI-generated content.
              </li>
              <li>
                You are solely responsible for decisions made based on
                AI-generated analysis.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              9. Service Availability
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We strive to keep the Service available but do not guarantee
              uninterrupted access. The Service may be temporarily unavailable
              due to maintenance, updates, or factors beyond our control. We
              reserve the right to modify, suspend, or discontinue the Service
              at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              10. Limitation of Liability
            </h3>
            <p className="text-gray-700 leading-relaxed">
              To the maximum extent permitted by law, AI Home Research and its
              operators shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of
              profits or revenues, whether incurred directly or indirectly, or
              any loss of data, use, goodwill, or other intangible losses
              resulting from your use of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              11. Disclaimer of Warranties
            </h3>
            <p className="text-gray-700 leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind, either express or
              implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, and
              non-infringement.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              12. Changes to Terms
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We may revise these Terms at any time by posting an updated
              version on this page. Your continued use of the Service after
              changes are posted constitutes your acceptance of the revised
              Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              13. Governing Law
            </h3>
            <p className="text-gray-700 leading-relaxed">
              These Terms are governed by and construed in accordance with the
              laws of the United States. Any disputes arising from these Terms
              or the Service shall be resolved in the appropriate courts.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              14. Contact
            </h3>
            <p className="text-gray-700 leading-relaxed">
              For questions about these Terms, contact us at:{" "}
              <a
                href="mailto:legal@aicalculator.homes"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                legal@aicalculator.homes
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
