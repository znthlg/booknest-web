import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | BookNest",
  description: "Privacy Policy for BookNest.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-foreground/65">Effective Date: 01.03.2026</p>

        <div className="mt-6 space-y-6 text-sm leading-7 text-foreground/85">
          <section>
            <p>
              BookNest ("we", "our", or "us") operates the BookNest mobile application.
              This Privacy Policy explains how we collect, use, and protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Information We Collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Email address (for account creation and login)</li>
              <li>User-generated content (such as books, authors, and library data)</li>
              <li>Photos (profile images only)</li>
              <li>Usage data (app interactions for analytics)</li>
              <li>Diagnostic data (crash logs and performance data)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">How We Use Information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Provide and maintain the app</li>
              <li>Authenticate users and manage accounts</li>
              <li>Enable core features (book tracking and organization)</li>
              <li>Improve app performance and stability</li>
              <li>Analyze usage to improve user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Data Storage</h2>
            <p className="mt-2">
              Your data is securely stored using trusted third-party services such as Firebase
              (Google Cloud).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Data Sharing</h2>
            <p className="mt-2">
              We do not sell, trade, or share your personal data with third parties for
              advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Data Security</h2>
            <p className="mt-2">
              We take reasonable measures to protect your data. However, no system is completely
              secure.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Your Rights</h2>
            <p className="mt-2">
              You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Children&apos;s Privacy</h2>
            <p className="mt-2">
              BookNest is not intended for children under 13, and we do not knowingly collect
              data from children.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Changes to This Policy</h2>
            <p className="mt-2">
              We may update this policy from time to time. Changes will be reflected in the app
              or website.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Contact</h2>
            <p className="mt-2">If you have any questions, you can contact us at:</p>
            <p className="mt-1">
              <a className="underline hover:no-underline" href="mailto:info@zenithalig.com">
                Contact us
              </a>
            </p>
            <p>Company Location: Belgium</p>
          </section>
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 text-sm text-foreground/70">
          <Link href="/support" className="underline hover:no-underline">
            Need help? Visit Support
          </Link>
        </div>
      </div>
    </main>
  );
}
