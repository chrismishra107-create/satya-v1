"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Bookmark, BookmarkCheck, Search, Award, Download, X } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

function timeAgo(dateString) {
  if (!dateString) return "recently";
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function calculateLevel(days) {
  if (days >= 30) return { level: 4, title: "Senior Strategist" };
  if (days >= 14) return { level: 3, title: "Intelligence Analyst" };
  if (days >= 5) return { level: 2, title: "Field Researcher" };
  return { level: 1, title: "Apprentice" };
}

function FeedItem({ card, isSaved, onToggleSave }) {
  const router = useRouter();

  const handleKnowMoreClick = async (e) => {
    e.preventDefault();
    const supabase = await createClient();
    supabase.from("click_analytics").insert([{ 
      card_id: card.id,
      headline: card.headline
    }]).then();

    router.push(`/cards/${card.id}`);
  };

  return (
    <div className="block py-6 border-b border-white/[0.08] relative">
      <Link href={`/cards/${card.id}`} onClick={handleKnowMoreClick} className="block group relative overflow-hidden rounded-[24px] mb-4 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        {card.image_url ? (
          <div className="w-full h-[450px] sm:h-[480px] relative bg-black">
            <img src={card.image_url} alt="Cover" className="w-full h-full object-cover transition duration-700 group-hover:scale-105 opacity-70" />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30"></div>

            <div className="absolute top-0 inset-x-0 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black text-[10px] shadow-lg">
                  S
                </div>
                <span className="font-bold text-white tracking-tight text-xs font-satoshi">satya</span>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] font-satoshi">
                {timeAgo(card.published_at)}
              </span>
            </div>

            <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 flex flex-col justify-end z-10">
              <h2 className="text-[20px] sm:text-[23px] font-clash font-semibold text-white leading-snug tracking-wide mb-2.5 drop-shadow-md">
                {card.headline}
              </h2>
              <p className="text-[13px] sm:text-[14px] leading-relaxed text-slate-300 line-clamp-3 font-satoshi font-normal">
                {card.summary}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[280px] flex flex-col justify-end p-6 rounded-[24px] bg-[#0c1222] border border-white/5">
            <h2 className="text-[20px] font-clash font-semibold text-white mb-2">{card.headline}</h2>
            <p className="text-sm font-satoshi text-slate-300">{card.summary}</p>
          </div>
        )}
      </Link>

      <div className="flex items-center justify-between px-2">
        <button
          type="button"
          onClick={handleKnowMoreClick}
          className="flex items-center gap-2 text-[11px] font-clash font-semibold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition bg-cyan-950/30 px-5 py-2.5 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Know More</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleSave(card)}
          className="flex items-center gap-2 text-[10px] font-satoshi font-bold uppercase tracking-widest text-slate-400 hover:text-white transition px-4 py-2.5 bg-white/5 rounded-full border border-white/10 hover:bg-white/10"
        >
          {isSaved ? <BookmarkCheck className="h-4 w-4 text-cyan-400" /> : <Bookmark className="h-4 w-4" />}
          <span>{isSaved ? "Saved" : "Save"}</span>
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const [userStats, setUserStats] = useState({ total_days_read: 1 });

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const client = await createClient();
      const { data: { session } } = await client.auth.getSession();

      const { data: newsData, error } = await client
        .from("news_cards")
        .select("*")
        .order("published_at", { ascending: false });

      if (!error && newsData) {
        setCards(newsData);
      }

      if (session?.user) {
        setUserId(session.user.id);
        const todayStr = new Date().toISOString().split("T")[0];
        
        const [{ data: bookmarks }, { data: progress }] = await Promise.all([
          client.from("bookmarks").select("card_id").eq("user_id", session.user.id),
          client.from("user_progress").select("*").eq("user_id", session.user.id).single()
        ]);

        if (bookmarks) setSavedIds(new Set(bookmarks.map((b) => b.card_id)));

        if (progress) {
          if (progress.last_read_date !== todayStr) {
            const newTotal = progress.total_days_read + 1;
            await client
              .from("user_progress")
              .update({ total_days_read: newTotal, last_read_date: todayStr })
              .eq("user_id", session.user.id);
            setUserStats({ total_days_read: newTotal });
          } else {
            setUserStats(progress);
          }
        } else {
          await client
            .from("user_progress")
            .insert([{ user_id: session.user.id, total_days_read: 1, last_read_date: todayStr }]);
          setUserStats({ total_days_read: 1 });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleToggleSave = async (card) => {
    if (!userId) {
      router.push("/login");
      return;
    }

    try {
      const client = await createClient();
      const isSaved = savedIds.has(card.id);
      
      if (isSaved) {
        await client.from("bookmarks").delete().eq("user_id", userId).eq("card_id", card.id);
      } else {
        await client.from("bookmarks").insert({ user_id: userId, card_id: card.id });
      }
      
      setSavedIds((prev) => {
        const next = new Set(prev);
        isSaved ? next.delete(card.id) : next.add(card.id);
        return next;
      });
    } catch (err) {
      console.error("Error saving bookmark:", err);
    }
  };

  const userLevel = calculateLevel(userStats.total_days_read);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700,900&display=swap');
        .font-clash { font-family: 'Clash Display', sans-serif; }
        .font-satoshi { font-family: 'Satoshi', sans-serif; }
      `}} />

      <main className="min-h-screen bg-[#050505] px-4 py-4 text-white sm:px-6 relative overflow-hidden font-satoshi">
        <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full filter blur-[140px] opacity-10 bg-cyan-600"></div>
          <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full filter blur-[150px] opacity-[0.15] bg-blue-900"></div>
        </div>

        <div className="mx-auto max-w-xl relative z-10 pt-2">
          {/* Header Bar */}
          <div className="mb-6 flex items-center justify-between px-2">
            <div>
              <h1 className="text-xl font-clash font-semibold text-white tracking-wide drop-shadow-md">
                Daily Geopolitical Feed
              </h1>
            </div>

            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-xl">
              <Award className="h-4 w-4 text-cyan-500" />
              <div className="text-right">
                <span className="text-[10px] font-clash font-semibold text-white block leading-none">
                  Level {userLevel.level}
                </span>
                <span className="text-[8px] font-satoshi text-slate-500 uppercase tracking-wider block mt-0.5">
                  {userStats.total_days_read} Days Active
                </span>
              </div>
            </div>
          </div>

          {/* INSTALL APP BANNER (Appears when browser triggers PWA installation) */}
          {showInstallBanner && (
            <div className="mb-6 bg-cyan-950/40 border border-cyan-500/30 p-4 rounded-2xl flex items-center justify-between backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500 text-black flex items-center justify-center font-bold">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-clash font-bold text-white uppercase tracking-wider">Install Satya App</h4>
                  <p className="text-[11px] text-slate-300">Add to your home screen for instant daily briefings.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-cyan-400 text-black rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-cyan-300 transition"
                >
                  Install
                </button>
                <button 
                  onClick={() => setShowInstallBanner(false)}
                  className="p-2 text-slate-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-32 flex justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin"></div></div>
          ) : cards.length === 0 ? (
            <div className="py-20 text-center text-slate-600 font-clash text-xs uppercase tracking-widest">
              No briefings published yet. Run auto-draft in admin to publish.
            </div>
          ) : (
            <div className="pb-20">
              {cards.map((card) => (
                <FeedItem
                  key={card.id}
                  card={card}
                  isSaved={savedIds.has(card.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}