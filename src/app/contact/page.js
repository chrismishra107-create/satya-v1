"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Instagram } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>

        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Contact</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Get in touch</h1>
        <p className="mt-2 text-sm text-slate-500">
          Found something wrong in a card, have a suggestion, or want to report an issue?
        </p>

        <div className="mt-6 space-y-2">
          <a
            href="mailto:REPLACE-WITH-YOUR-EMAIL@gmail.com"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300"
          >
            <Mail className="h-4 w-4 text-blue-600" />
            classifiedbychris@gmail.com
          </a>

          <a
            href="https://www.instagram.com/classifiedbychris/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300"
          >
            <Instagram className="h-4 w-4 text-blue-600" />
            @classifiedbychris
          </a>
        </div>
      </div>
    </main>
  );
}