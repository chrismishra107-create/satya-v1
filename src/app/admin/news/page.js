"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Trash2, RefreshCw, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

export default function AdminNewsPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingDrafts, setPendingDrafts] = useState([]);
  const [publishedCards, setPublishedCards] = useState([]);
  const [comments, setComments] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function initAdmin() {
      try {
        const client = await createClient();
        setSupabase(client);
        await loadData(client);
      } catch (err) {
        console.error("Admin init error:", err);
      } finally {
        setLoading(false);
      }
    }
    initAdmin();
  }, []);

  async function loadData(client) {
    // 1. Fetch pending drafts
    const { data: drafts } = await client
      .from("pending_drafts")
      .select("*")
      .order("structural_score", { ascending: false });
    setPendingDrafts(drafts || []);

    // 2. Fetch published cards
    const { data: published } = await client
      .from("news_cards")
      .select("*")
      .order("published_at", { ascending: false });
    setPublishedCards(published || []);

    // 3. Fetch all comments for moderation
    const { data: commentData } = await client
      .from("card_comments")
      .select("id, text, created_at, card_id")
      .order("created_at", { ascending: false });
    setComments(commentData || []);
  }

  const handleAutoDraft = async () => {
    setStatusMessage("Triggering AI pipeline to fetch and analyze fresh briefings...");
    setPublishing(true);
    try {
      const res = await fetch("/api/auto-draft", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate drafts.");
      setStatusMessage("Fresh drafts generated successfully!");
      if (supabase) await loadData(supabase);
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishAll = async () => {
    if (pendingDrafts.length === 0) return;
    setStatusMessage("Publishing approved dossiers to the live feed...");
    setPublishing(true);

    try {
      const res = await fetch("/api/admin/publish", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed.");
      setStatusMessage("All approved drafts published successfully!");
      if (supabase) await loadData(supabase);
    } catch (err) {
      setStatusMessage(`Publishing error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeletePublishedCard = async (id) => {
    if (!confirm("Are you sure you want to delete this live briefing?")) return;
    try {
      const { error } = await supabase.from("news_cards").delete().eq("id", id);
      if (error) throw error;
      setPublishedCards(publishedCards.filter(c => c.id !== id));
      setStatusMessage("Briefing successfully deleted from live feed.");
    } catch (err) {
      setStatusMessage(`Delete error: ${err.message}`);
    }
  };

  const handleDeleteComment = async (id) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const { error } = await supabase.from("card_comments").delete().eq("id", id);
      if (error) throw error;
      setComments(comments.filter(c => c.id !== id));
      setStatusMessage("Comment deleted.");
    } catch (err) {
      setStatusMessage(`Delete error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="h-8 w-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700,900&display=swap');
        .font-clash { font-family: 'Clash Display', sans-serif; }
        .font-satoshi { font-family: 'Satoshi', sans-serif; }
      `}} />

      <main className="min-h-screen bg-black text-white px-4 py-8 sm:px-10 font-satoshi">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-[10px] font-clash font-bold uppercase tracking-widest text-cyan-400">Editorial Control Room</span>
              <h1 className="text-2xl font-clash font-bold text-white tracking-wide">Command Center</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAutoDraft}
                disabled={publishing}
                className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-clash font-bold uppercase tracking-widest text-white hover:bg-white/10 transition flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${publishing ? "animate-spin" : ""}`} />
                <span>Run Auto-Draft</span>
              </button>

              <button
                onClick={handlePublishAll}
                disabled={publishing || pendingDrafts.length === 0}
                className="px-6 py-3 rounded-xl bg-cyan-400 text-black text-xs font-clash font-bold uppercase tracking-widest shadow-lg shadow-cyan-400/20 hover:bg-cyan-300 transition disabled:opacity-50"
              >
                Publish Approved ({pendingDrafts.length})
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="p-4 rounded-2xl bg-[#0c1222] border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* SECTION 1: LIVE PUBLISHED CARDS (WITH DELETE OPTION) */}
          <div className="space-y-4">
            <h2 className="text-sm font-clash font-semibold text-white uppercase tracking-widest flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Live Published Briefings ({publishedCards.length})
            </h2>

            {publishedCards.length === 0 ? (
              <p className="text-xs text-slate-500">No cards published to the live feed yet.</p>
            ) : (
              <div className="space-y-3">
                {publishedCards.map((card) => (
                  <div key={card.id} className="bg-[#0c1222]/60 border border-white/10 p-5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Live on Feed</span>
                      <h3 className="text-sm font-bold text-white leading-snug">{card.headline}</h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{card.summary}</p>
                    </div>

                    <button
                      onClick={() => handleDeletePublishedCard(card.id)}
                      className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60 transition flex-shrink-0"
                      title="Delete Briefing"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: COMMENT MODERATION */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <h2 className="text-sm font-clash font-semibold text-white uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cyan-400" />
              User Comments Moderation ({comments.length})
            </h2>

            {comments.length === 0 ? (
              <p className="text-xs text-slate-500">No user discussions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-[#0c1222]/60 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-200">{comment.text}</p>
                      <span className="text-[9px] text-slate-500">{new Date(comment.created_at).toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60 transition flex-shrink-0"
                      title="Delete Comment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  );
}