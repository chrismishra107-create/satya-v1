"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, Bookmark, BookmarkCheck, Share2, Check, MessageCircle, Flag, ShieldCheck, Sparkles, X, BookOpen, ChevronDown, Compass } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

const RATE_OPTIONS = [1, 1.25, 1.5];

export default function CardShortsFeed() {
  const params = useParams();
  const router = useRouter();
  const [supabase, setSupabase] = useState(null);
  const [userId, setUserId] = useState(null);
  
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState(new Set());
  
  const [activeCardId, setActiveCardId] = useState(params.id);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1.15);
  const [shareCopiedId, setShareCopiedId] = useState(null);

  const [expandedDeepDives, setExpandedDeepDives] = useState({});

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const observerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    async function loadFeed() {
      try {
        const client = await createClient();
        setSupabase(client);

        const { data: { session } } = await client.auth.getSession();
        
        if (session?.user) {
          setUserId(session.user.id);
          const { data: bookmarks } = await client
            .from("bookmarks")
            .select("card_id")
            .eq("user_id", session.user.id);
            
          if (bookmarks) {
            setSavedIds(new Set(bookmarks.map((b) => b.card_id)));
          }
        }

        // Fetch live feed
        const { data: feedData, error: feedError } = await client
          .from("news_cards")
          .select("*")
          .order("published_at", { ascending: false });
          
        if (feedError) throw new Error("Unable to load feed.");
        
        let allCards = feedData || [];

        // Arrange so the clicked card is first
        const targetCard = allCards.find(c => c.id === params.id);
        const otherCards = allCards.filter(c => c.id !== params.id);
        
        if (targetCard) {
          setCards([targetCard, ...otherCards]);
        } else {
          setCards(allCards);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load the feed.");
      } finally {
        setLoading(false);
      }
    }

    loadFeed();

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [params.id]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const newId = entry.target.getAttribute("data-id");
            if (newId !== activeCardId) {
              setActiveCardId(newId);
              if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                setSpeaking(false);
                setPaused(false);
              }
              setCommentsOpen(false);
            }
          }
        });
      },
      { threshold: 0.6 } 
    );

    const elements = document.querySelectorAll(".shorts-card");
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [cards, activeCardId]);

  const handleBack = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    router.push("/");
  };

  const speak = (card, speakRate) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Uses the new columns for TTS
    const fullText = `${card.headline}. ${card.summary}. Timeline: ${card.when_time || 'Recent updates'}. Location: ${card.where_location || 'Global jurisdiction'}. Strategic context: ${card.why_1 || card.summary}`;

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = speakRate;
    utterance.pitch = 1.25; 

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = 
      voices.find(v => (v.lang === "hi-IN" || v.lang === "en-IN") && (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman") || v.name.includes("Aditi") || v.name.includes("Lekha"))) ||
      voices.find(v => v.lang === "hi-IN" || v.lang === "en-IN") || 
      voices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman") || v.name.includes("Samantha")) || 
      voices.find(v => v.lang.startsWith("en")); 

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setPaused(false);
  };

  const handlePlay = (card) => {
    if (speaking && !paused) {
      window.speechSynthesis.pause();
      setPaused(true);
      return;
    }
    if (speaking && paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      return;
    }
    speak(card, rate);
  };

  const handleRateChange = (card, option) => {
    setRate(option);
    if (speaking) speak(card, option);
  };

  const toggleDeepDive = (cardId) => {
    setExpandedDeepDives(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleToggleSave = async (cardId) => {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (!supabase) return;
    
    const isSaved = savedIds.has(cardId);
    if (isSaved) {
      await supabase.from("bookmarks").delete().eq("user_id", userId).eq("card_id", cardId);
    } else {
      await supabase.from("bookmarks").insert({ user_id: userId, card_id: cardId });
    }
    
    setSavedIds((current) => {
      const next = new Set(current);
      isSaved ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  };

  const handleShare = async (card) => {
    const shareText = `${card.headline}\n\n${card.summary}`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: card.headline, text: shareText, url: shareUrl });
      } catch {}
      return;
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setShareCopiedId(card.id);
      setTimeout(() => setShareCopiedId(null), 2000);
    } catch {}
  };

  const handleToggleComments = async (cardId) => {
    setCommentsOpen(true);
    setCommentsLoading(true);
    try {
      const { data } = await supabase
        .from("card_comments")
        .select("id, text, created_at, user_id, reply_to")
        .eq("card_id", cardId)
        .order("created_at", { ascending: true });
      setComments(data || []);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostComment = async (event) => {
    event.preventDefault();
    if (!userId) {
      router.push("/login");
      return;
    }
    if (!supabase || !commentText.trim()) return;

    setCommentSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("card_comments")
        .insert({ card_id: activeCardId, user_id: userId, text: commentText.trim() });
      if (!insertError) {
        setCommentText("");
        handleToggleComments(activeCardId); 
      }
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="fixed inset-0 z-50 bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4 animate-pulse">
           <div className="h-8 w-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin"></div>
        </div>
      </main>
    );
  }

  if (error || cards.length === 0) {
    return (
      <main className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white px-6">
        <p className="text-sm text-slate-500 mb-6 font-satoshi">{error || "No briefings found in this stream."}</p>
        <button onClick={handleBack} className="rounded-full bg-white/10 px-6 py-3 text-xs font-clash font-semibold uppercase tracking-widest text-white shadow-xl hover:bg-white/20 transition">
          Return to Hub
        </button>
      </main>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700,900&display=swap');
        
        .font-clash { font-family: 'Clash Display', sans-serif; }
        .font-satoshi { font-family: 'Satoshi', sans-serif; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* FULL SCREEN SHORTS FEED CONTAINER - ULTRA DARK MODE */}
      <main className="fixed inset-0 z-50 bg-black h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll overflow-x-hidden no-scrollbar font-satoshi">
        
        {/* GLOBAL BACK BUTTON */}
        <button
          onClick={handleBack}
          className="fixed top-6 left-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-white shadow-lg transition active:scale-95 hover:bg-black/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {cards.map((card) => {
          const isVerified = true; // All cards generated from our strict pipeline are verified
          const isSaved = savedIds.has(card.id);
          const isActive = activeCardId === card.id;
          const isExpanded = !!expandedDeepDives[card.id];

          return (
            <div key={card.id} data-id={card.id} className="shorts-card relative h-[100dvh] w-full snap-start snap-always bg-black flex flex-col justify-center">
              
              {/* FULL SCREEN BACKGROUND IMAGE */}
              {card.image_url ? (
                <div className="absolute inset-0 w-full h-full bg-black">
                   <img src={card.image_url} alt={card.headline} className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
                   {/* Heavy dark gradient overlay for contrast */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/30"></div>
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#0a0a0a] to-black z-0" />
              )}

              {/* TEXT CONTENT CONTAINER (SCROLLABLE & GLASSY) */}
              <div className="relative z-20 w-[90%] sm:w-[75%] max-w-xl mx-auto flex flex-col justify-center h-full py-12">
                
                {/* DARK PANE */}
                <div className="bg-[#050505]/90 backdrop-blur-2xl border-[1px] border-white/[0.08] rounded-[32px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] max-h-[78vh] overflow-y-auto no-scrollbar transition-all duration-300">
                  
                  <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/[0.05] pb-3">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                      <ShieldCheck className="mr-1 h-3 w-3" /> Verified Intelligence
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-satoshi">
                      {new Date(card.published_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h1 className="text-[22px] sm:text-[26px] font-clash font-semibold text-white leading-tight mb-3 tracking-wide drop-shadow-lg">
                    {card.headline}
                  </h1>
                  
                  <p className="text-[14px] text-slate-300 font-medium leading-relaxed mb-4 font-satoshi">
                    {card.summary}
                  </p>

                  {/* RIGOROUS 5Ws & "5 WHYS" BREAKDOWN (EXPANDABLE) */}
                  {isExpanded && (
                    <div className="space-y-4 pt-4 border-t border-white/[0.05] animate-in fade-in duration-300 text-left">
                      
                      {/* Timeline & Location & Entities */}
                      <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/[0.03] space-y-3">
                        <h4 className="text-[11px] font-clash font-semibold uppercase tracking-[0.15em] text-cyan-400 flex items-center gap-1.5 mb-2">
                          <BookOpen className="h-3.5 w-3.5" /> Intelligence Breakdown
                        </h4>
                        <div>
                          <strong className="text-[10px] uppercase text-slate-500 tracking-widest block font-satoshi">Timeline</strong>
                          <span className="text-[13px] text-slate-200">{card.when_time || "Recent updates."}</span>
                        </div>
                        <div>
                          <strong className="text-[10px] uppercase text-slate-500 tracking-widest block font-satoshi mt-2">Location / Jurisdiction</strong>
                          <span className="text-[13px] text-slate-200">{card.where_location || "National / Global zones."}</span>
                        </div>
                        <div>
                          <strong className="text-[10px] uppercase text-slate-500 tracking-widest block font-satoshi mt-2">Key Entities Involved</strong>
                          <span className="text-[13px] text-slate-200">{card.who || "Classified / Not specified."}</span>
                        </div>
                        <div>
                          <strong className="text-[10px] uppercase text-slate-500 tracking-widest block font-satoshi mt-2">Core Action</strong>
                          <span className="text-[13px] text-slate-200">{card.what || "Structural change enacted."}</span>
                        </div>
                      </div>

                      {/* The 5 Whys */}
                      <div className="bg-[#050505] p-5 rounded-2xl border border-white/[0.05] space-y-4 shadow-inner">
                        <h4 className="text-[11px] font-clash font-semibold uppercase tracking-[0.15em] text-emerald-400">Strategic Analysis</h4>
                        
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 font-satoshi">Immediate Trigger</p>
                          <p className="text-[13px] text-slate-200">{card.why_1}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 font-satoshi">Timing & Context</p>
                          <p className="text-[13px] text-slate-200">{card.why_2}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 font-satoshi">Structural Motive</p>
                          <p className="text-[13px] text-slate-200">{card.why_3}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 font-satoshi">Impact Outlook</p>
                          <p className="text-[13px] text-slate-200">{card.why_4}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 font-satoshi">Grand Strategy</p>
                          <p className="text-[13px] text-slate-200">{card.why_5}</p>
                        </div>
                      </div>

                      {/* Historical Context */}
                      {card.historical_context && (
                        <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-white/[0.05]">
                          <h4 className="text-[10px] font-clash font-semibold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                            <Compass className="h-3.5 w-3.5" /> Historical Context
                          </h4>
                          <p className="text-[12px] text-slate-400 leading-relaxed italic">
                            {card.historical_context}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DEEP DIVE TOGGLE BUTTON */}
                  <button
                    onClick={() => toggleDeepDive(card.id)}
                    className="mt-5 w-full py-3.5 px-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/80 hover:text-white text-[10px] font-clash font-semibold uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg hover:bg-white/[0.06] transition"
                  >
                    <span>{isExpanded ? "Hide Full Dossier" : "Read In-Depth 5Ws & '5 Whys'"}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                </div>
              </div>

              {/* SIDEBAR ACTIONS (BOTTOM RIGHT) */}
              <div className="absolute right-3 sm:right-6 bottom-8 z-30 flex flex-col items-center gap-5">
                
                {/* Play Audio Button (High Contrast) */}
                <div className="relative mb-2">
                  <div className={`absolute inset-0 bg-cyan-500 rounded-full blur-xl transition-opacity duration-300 ${isActive && speaking ? "opacity-40 animate-pulse" : "opacity-0"}`}></div>
                  <button
                    type="button"
                    onClick={() => handlePlay(card)}
                    className="relative flex h-[50px] w-[50px] items-center justify-center rounded-full bg-cyan-500 text-black shadow-lg active:scale-95 transition-transform hover:bg-cyan-400"
                  >
                    {isActive && speaking && !paused ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-1" />}
                  </button>
                  {isActive && speaking && (
                     <div className="absolute -left-14 top-0 flex flex-col gap-2">
                        {RATE_OPTIONS.map((opt) => (
                           <button 
                             key={opt}
                             onClick={() => handleRateChange(card, opt)}
                             className={`h-7 w-11 rounded-full text-[10px] font-bold border transition shadow-lg backdrop-blur-md ${rate === opt ? "bg-cyan-500 text-black border-cyan-500" : "bg-black/80 text-white/70 border-white/20 hover:bg-black"}`}
                           >
                             {opt}x
                           </button>
                        ))}
                     </div>
                  )}
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  onClick={() => handleToggleSave(card.id)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-slate-300 transition group-active:scale-95 group-hover:bg-white/10 group-hover:text-white">
                    {isSaved ? <BookmarkCheck className="h-5 w-5 text-cyan-400" /> : <Bookmark className="h-5 w-5" />}
                  </div>
                  <span className="text-[10px] font-satoshi font-bold text-slate-500 drop-shadow-md group-hover:text-white">Save</span>
                </button>

                {/* Comments Button */}
                <button
                  type="button"
                  onClick={() => handleToggleComments(card.id)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-slate-300 transition group-active:scale-95 group-hover:bg-white/10 group-hover:text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-satoshi font-bold text-slate-500 drop-shadow-md group-hover:text-white">Discuss</span>
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={() => handleShare(card)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-slate-300 transition group-active:scale-95 group-hover:bg-white/10 group-hover:text-white">
                    {shareCopiedId === card.id ? <Check className="h-5 w-5 text-emerald-400" /> : <Share2 className="h-5 w-5" />}
                  </div>
                  <span className="text-[10px] font-satoshi font-bold text-slate-500 drop-shadow-md group-hover:text-white">Share</span>
                </button>

              </div>
            </div>
          );
        })}
      </main>

      {/* DARK COMMENTS BOTTOM SHEET */}
      {commentsOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCommentsOpen(false)}></div>
          
          <div className="relative w-full h-[65vh] bg-[#050505] border-t border-white/[0.08] rounded-t-[32px] shadow-[0_-20px_50px_rgba(0,0,0,0.9)] flex flex-col animate-in slide-in-from-bottom-full duration-300 font-satoshi">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
              <h3 className="text-sm font-clash font-semibold text-white uppercase tracking-widest">Strategic Discussion</h3>
              <button onClick={() => setCommentsOpen(false)} className="p-2 bg-white/5 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {commentsLoading ? (
                <div className="flex justify-center py-10 text-slate-600 animate-pulse text-xs font-bold uppercase tracking-widest">Loading intelligence...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10 text-slate-600 text-xs font-bold uppercase tracking-widest">No discourse yet. Initiate analysis.</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5 shadow-sm flex flex-col gap-2">
                    <p className="text-[13px] leading-relaxed text-slate-300">{comment.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(comment.created_at).toLocaleDateString()}</span>
                      <button className="text-slate-600 hover:text-red-500 transition"><Flag className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-black border-t border-white/[0.05]">
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder={userId ? "Input strategic perspective..." : "Log in to join the briefing..."}
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500 focus:bg-white/10 transition"
                  maxLength={500}
                />
                <button type="submit" disabled={commentSubmitting || !commentText.trim()} className="rounded-full bg-cyan-500 px-6 py-3 text-xs font-clash font-semibold uppercase tracking-widest text-black shadow-lg disabled:opacity-50 transition hover:bg-cyan-400">
                  Submit
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}