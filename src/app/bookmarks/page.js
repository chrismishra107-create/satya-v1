"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookmarkX, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { getUserProfile } from "@/lib/profile";
import { useCategory } from "@/lib/categoryContext";

export default function BookmarksPage() {
  const [cards, setCards] = useState([]);
  const [supabase, setSupabase] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { activeRole } = useCategory();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const client = await createClient();
        setSupabase(client);

        const {
          data: { session },
        } = await client.auth.getSession();

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        setUserId(session.user.id);
        await getUserProfile(client, session.user.id);

        const { data, error: fetchError } = await client
          .from("bookmarks")
          .select("card_id, created_at, news_cards(id, headline, summary, why_it_matters_student, why_it_matters_business, published_at, is_demo_content)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setCards((data || []).map((row) => row.news_cards).filter(Boolean));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load your saved cards.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const handleRemove = async (cardId) => {
    if (!supabase || !userId) return;
    await supabase.from("bookmarks").delete().eq("user_id", userId).eq("card_id", cardId);
    setCards((current) => current.filter((card) => card.id !== cardId));
  };

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>

        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Saved</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Your saved briefings</h1>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm text-slate-400">Loading…</p>
        ) : cards.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Nothing saved yet.{" "}
            <Link href="/" className="font-bold text-blue-600 hover:underline">
              Back to your feed
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {cards.map((card) => {
              const whyItMatters = activeRole === "business" ? card.why_it_matters_business : card.why_it_matters_student;

              return (
                <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-400">
                    {card.published_at ? new Date(card.published_at).toLocaleDateString() : "Recently"}
                  </p>
                  <Link href={`/cards/${card.id}`} className="mt-1 block text-base font-bold text-slate-900 hover:text-blue-600">
                    {card.headline}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{card.summary}</p>

                  {whyItMatters ? (
                    <p className="mt-2 line-clamp-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">why it matters →</span> {whyItMatters}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleRemove(card.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-500"
                  >
                    <BookmarkX className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}