"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPollPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [action, setAction] = useState("");
  const [deadline, setDeadline] = useState("");
  const [resolutionSource, setResolutionSource] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
    if (!subject && !action && !deadline && !resolutionSource) {
      return "Your preview will appear here.";
    }

    return `Will ${subject || "[Subject]"} ${action || "[Action]"} by ${deadline || "[Deadline]"}? Resolves via ${resolutionSource || "[Source]"}.`;
  }, [subject, action, deadline, resolutionSource]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!subject || !action || !deadline || !resolutionSource) {
      setError("Please complete every field.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, action, deadline, resolution_source: resolutionSource }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to create poll.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-slate-800 bg-slate-900/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Create Poll</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Start a new prediction</h1>
          </div>
        </div>

        {error ? <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white">{error}</div> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Subject</span>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Action / Outcome</span>
            <input value={action} onChange={(event) => setAction(event.target.value)} className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Deadline</span>
            <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Resolution source</span>
            <input value={resolutionSource} onChange={(event) => setResolutionSource(event.target.value)} className="w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </label>

          <div className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-sm font-medium text-slate-300">Preview</p>
            <p className="mt-2 text-sm leading-7 text-slate-200">{preview}</p>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-3xl border border-white/10 bg-white/10 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/15 disabled:opacity-60">
            {loading ? "Creating poll..." : "Create poll"}
          </button>
        </form>
      </div>
    </main>
  );
}
