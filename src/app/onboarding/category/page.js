"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Copy, GraduationCap, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { getUserProfile, setUserCategory } from "@/lib/profile";

const SETUP_SQL = `create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  category text check (category in ('student', 'business')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user ()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;`;

const options = [
  {
    value: "student",
    title: "Student",
    description:
      "Visa updates, scholarships, study abroad — jo tumhare padhai se juda hai.",
    icon: GraduationCap,
  },
  {
    value: "business",
    title: "Business",
    description:
      "Trade deals, markets, policy shifts — jo tumhare kaam ya business ko affect kare.",
    icon: Briefcase,
  },
];

export default function CategorySelectionPage() {
  const [supabase, setSupabase] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const setupBoxRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const client = await createClient();
      if (!active) {
        return;
      }

      setSupabase(client);

      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);

      try {
        const profile = await getUserProfile(client, session.user.id);
        if (profile?.category) {
          setSelectedCategory(profile.category);
        }
        setNeedsSetup(false);
      } catch (err) {
        if (err instanceof Error && err.message === "PROFILES_TABLE_MISSING") {
          setNeedsSetup(true);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_SQL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy nahi ho paya — SQL box se manually copy karo.");
    }
  };

  const handleRecheckSetup = async () => {
    if (!supabase || !userId || checkingSetup) {
      return;
    }

    setCheckingSetup(true);
    setError("");

    try {
      const profile = await getUserProfile(supabase, userId);
      setNeedsSetup(false);

      if (profile?.category) {
        setSelectedCategory(profile.category);
        setError("Database ready hai! Ab Student ya Business choose karo.");
        return;
      }

      setError("Database ready hai! Ab Student ya Business choose karo.");
    } catch (err) {
      if (err instanceof Error && err.message === "PROFILES_TABLE_MISSING") {
        setNeedsSetup(true);
        setError(
          "Abhi bhi profiles table nahi mila. Supabase SQL Editor mein Run dabane ke baad yahan 'Check again' dabao."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Setup check fail ho gaya. Please try again."
        );
      }
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleSelect = async (category) => {
    if (saving) {
      return;
    }

    if (needsSetup) {
      setError(
        "Pehle upar wale orange box mein SQL Supabase mein run karo, phir 'I've run the SQL — check again' dabao."
      );
      setupBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!supabase || !userId) {
      setError("App abhi connect nahi ho payi. Page refresh karo.");
      return;
    }

    setError("");
    setSaving(true);

    if (category === selectedCategory) {
      router.replace("/");
      router.refresh();
      return;
    }

    try {
      await setUserCategory(supabase, userId, category);
      router.replace("/");
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.message === "PROFILES_TABLE_MISSING") {
        setNeedsSetup(true);
        setError(
          "Database table abhi missing hai. Upar wala SQL run karo, phir check again dabao."
        );
        setupBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to save your choice. Please try again."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-100">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.33em] text-amber-400">
            60-Second Geopolitics
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            What brings you here?
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Pick one — hum news ko tumhare angle se dikhayenge. Baad mein settings
            se change kar sakte ho.
          </p>
        </div>

        {needsSetup ? (
          <div
            ref={setupBoxRef}
            className="mb-6 rounded-3xl border-2 border-amber-500/50 bg-amber-500/10 px-5 py-4 text-sm leading-6 text-amber-50"
          >
            <p className="font-semibold text-amber-200">
              Step required before buttons work
            </p>
            <p className="mt-2">
              Orange box isliye dikh raha hai kyunki Supabase mein{" "}
              <code className="text-amber-100">profiles</code> table abhi nahi bana.
              Iske bina Student/Business save nahi hoga.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-amber-200 underline"
                >
                  Supabase Dashboard
                </a>{" "}
                → apna project → <strong>SQL Editor</strong> → New query
              </li>
              <li>Neeche &quot;Copy SQL&quot; dabao, paste karo, <strong>Run</strong> dabao</li>
              <li>Wapas yahan aao → <strong>I&apos;ve run the SQL — check again</strong> dabao</li>
              <li>Phir Student ya Business choose karo</li>
            </ol>

            <textarea
              readOnly
              value={SETUP_SQL}
              rows={8}
              className="mt-4 w-full rounded-2xl border border-amber-500/20 bg-slate-950/80 p-3 font-mono text-xs text-amber-100"
            />

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/30"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy SQL"}
              </button>
              <button
                type="button"
                onClick={handleRecheckSetup}
                disabled={checkingSetup}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${checkingSetup ? "animate-spin" : ""}`} />
                {checkingSetup ? "Checking…" : "I've run the SQL — check again"}
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-3xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          {options.map((option) => {
            const Icon = option.icon;
            const blocked = needsSetup || saving;
            const isSelected = option.value === selectedCategory;

            return (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                onClick={() => handleSelect(option.value)}
                className={`group w-full rounded-[28px] border p-6 text-left shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition ${
                  blocked
                    ? "cursor-not-allowed border-slate-800/80 bg-slate-900/60 opacity-70"
                    : isSelected
                    ? "border-amber-400 bg-slate-900/95 shadow-[0_25px_70px_rgba(250,180,60,0.18)]"
                    : "border-slate-800 bg-slate-900/90 hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white">
                      {option.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {option.description}
                    </p>
                    {isSelected && !needsSetup ? (
                      <p className="mt-2 text-xs font-medium text-emerald-300">
                        Current selection — click again to confirm.
                      </p>
                    ) : null}
                    {needsSetup ? (
                      <p className="mt-2 text-xs font-medium text-amber-300/80">
                        Pehle upar wala SQL setup complete karo
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {saving ? (
          <p className="mt-6 text-center text-sm text-amber-300">Saving your choice…</p>
        ) : null}
      </div>
    </main>
  );
}
