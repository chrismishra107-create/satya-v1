"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>

        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">About</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Satya</h1>
        <p className="mt-1 text-sm text-slate-500">60-second geopolitics, your way.</p>

        <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            Most news apps cover everything, for everyone, in the same flat tone. Satya doesn't.
            We focus on one thing — geopolitics and how it actually affects India — and we deliver
            it in under 60 seconds, in the way you'd actually explain it to a friend.
          </p>
          <p>
            Every card is angled for you. Students see the visa, scholarship, and study-abroad
            angle. Business readers see the trade, policy, and market angle.
          </p>
          <p>No noise, no clickbait, no filler. Just the events that matter, and why.</p>
        </div>
      </div>
    </main>
  );
}