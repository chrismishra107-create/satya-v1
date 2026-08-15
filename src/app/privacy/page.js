"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>

        <h1 className="text-2xl font-extrabold text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-xs text-slate-400">Last updated: [DATE]</p>

        <div className="mt-6 space-y-5 text-sm leading-6 text-slate-700">
          <section>
            <h2 className="font-bold text-slate-900">What we collect</h2>
            <p className="mt-1">
              When you create an account, we collect your email address. We also store your
              selected category (student/business), any comments you post, cards you save,
              and — if you enable notifications — a push notification subscription token. We
              may record how long you spend reading a briefing to improve the app.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900">How we use it</h2>
            <p className="mt-1">
              We use this data to show you a personalized feed, let you save and comment on
              briefings, send you notifications about new content (only if you opt in), and
              improve what we publish.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900">What we don't do</h2>
            <p className="mt-1">
              We don't sell your data. We don't share your email or personal information with
              advertisers. We don't display ads.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900">Your rights</h2>
            <p className="mt-1">
              You can request deletion of your account and associated data at any time by
              contacting us. You can disable notifications and change your category anytime
              from the app.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900">Data storage</h2>
            <p className="mt-1">
              Your data is stored securely using Supabase. We take reasonable steps to protect
              it but cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900">Contact</h2>
            <p className="mt-1">
              Questions about this policy? Reach out at [YOUR EMAIL].
            </p>
          </section>

          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            This is a template policy and has not been reviewed by a lawyer. Before real
            public launch, have this reviewed against India's Digital Personal Data
            Protection (DPDP) Act requirements.
          </p>
        </div>
      </div>
    </main>
  );
}