"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function PublishPage() {
  const [supabase, setSupabase] = useState(null);
  const [session, setSession] = useState(undefined);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let active = true;

    createClient().then((client) => {
      if (!active) {
        return;
      }
      setSupabase(client);
      client.auth.getSession().then(({ data }) => {
        if (active) {
          setSession(data?.session ?? null);
        }
      });
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Type your post before publishing.");
      return;
    }

    if (trimmed.length > 280) {
      setError("Posts must be 280 characters or fewer.");
      return;
    }

    if (!supabase) {
      setError("Unable to connect to Supabase. Please reload the page.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: trimmed,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to publish post.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  if (session === undefined) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-800 bg-slate-900/95 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] text-center">
          <h1 className="text-3xl font-semibold text-white">Loading...</h1>
          <p className="mt-4 text-slate-400">Checking your session before publishing.</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-800 bg-slate-900/95 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] text-center">
          <h1 className="text-3xl font-semibold text-white">Publish your post</h1>
          <p className="mt-4 text-slate-400">
            Sign in first to submit content to the live Supabase feed.
          </p>
          <a
            href="/login"
            className="mt-8 inline-flex rounded-3xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Log in or sign up
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-800 bg-slate-900/95 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-white/80">Publish</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Create a new post</h1>
          <p className="mt-3 text-slate-400">
            Posts are stored directly in Supabase and shown instantly in the feed.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm font-medium text-slate-300">
            Post content
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              maxLength={280}
              className="mt-3 w-full rounded-[28px] border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
              placeholder="Share something meaningful in 280 characters or less..."
            />
          </label>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-400">{text.length}/280</span>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Publishing..." : "Publish post"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
