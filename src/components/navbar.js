"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { getUserProfile } from "@/lib/profile";
import { requestPushSubscription, getCurrentPushSubscription } from "@/lib/pushNotifications";
import { Menu, X, LogOut, ShieldCheck, Bookmark, Info, Mail, Search, Bell, BellOff, User } from "lucide-react";

export function Navbar() {
  const [session, setSession] = useState(null);
  const [supabase, setSupabase] = useState(null);
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [notifStatus, setNotifStatus] = useState("idle");
  const router = useRouter();

  useEffect(() => {
    let active = true;
    createClient().then((client) => {
      if (!active) return;
      setSupabase(client);

      client.auth.getSession().then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session?.user) {
          getUserProfile(client, data.session.user.id).then((p) => active && setProfile(p));
        }
      });

      const { data: authListener } = client.auth.onAuthStateChange(async (_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        if (nextSession?.user) {
          const nextProfile = await getUserProfile(client, nextSession.user.id);
          active && setProfile(nextProfile);
        } else {
          active && setProfile(null);
        }
      });

      return () => {
        active = false;
        authListener?.subscription.unsubscribe();
      };
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    getCurrentPushSubscription()
      .then((sub) => setNotifStatus(sub ? "enabled" : "idle"))
      .catch(() => {});
  }, []);

  const handleEnableNotifications = async () => {
    if (!session) {
      router.push("/login");
      return;
    }
    setNotifStatus("enabling");
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const subscription = await requestPushSubscription(vapidKey);

      let token = "";
      if (supabase) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        token = currentSession?.access_token || "";
      }

      await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      setNotifStatus("enabled");
    } catch (err) {
      setNotifStatus(err instanceof Error && err.message.includes("declined") ? "denied" : "error");
    }
  };

  const signOut = async () => {
    setMenuOpen(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-45 border-b border-white/10 bg-black/60 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-clash font-extrabold text-white tracking-[0.25em] text-sm drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]">SATYA</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {searchOpen ? (
              <input
                autoFocus
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onBlur={() => !searchValue && setSearchOpen(false)}
                placeholder="Search briefings..."
                className="w-32 rounded-full border border-cyan-500/40 bg-black/80 px-3.5 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 sm:w-48 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
              />
            ) : (
              <button type="button" onClick={() => setSearchOpen(true)} className="text-slate-300 hover:text-cyan-400 transition">
                <Search className="h-5 w-5" />
              </button>
            )}

            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="text-white hover:text-cyan-400 transition">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop overlay */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-md transition-opacity duration-300 ${menuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      {/* SIDEBAR */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-80 bg-[#070d19]/95 backdrop-blur-[60px] border-l border-white/15 p-7 shadow-[-20px_0_60px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out font-satoshi flex flex-col justify-between ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <p className="text-xs font-clash font-bold uppercase tracking-[0.2em] text-cyan-400">Navigation Menu</p>
            <button type="button" onClick={() => setMenuOpen(false)} className="text-slate-400 hover:text-white transition p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-col space-y-3">
            {profile?.is_admin ? (
              <Link href="/admin/news" onClick={() => setMenuOpen(false)} className="flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] transition text-sm font-bold text-white border border-white/10 shadow-md">
                <ShieldCheck className="h-4 w-4 text-cyan-400" /> 
                <span className="text-white">Admin News</span>
              </Link>
            ) : null}

            <Link 
              href={session ? "/bookmarks" : "/login"} 
              onClick={() => setMenuOpen(false)} 
              className="flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] transition text-sm font-semibold text-white border border-white/10 shadow-md"
            >
              <Bookmark className="h-4 w-4 text-cyan-400" /> 
              <span className="text-white">Saved Briefings</span>
            </Link>

            <button
              type="button"
              onClick={notifStatus === "enabled" ? undefined : handleEnableNotifications}
              disabled={notifStatus === "enabling" || notifStatus === "enabled"}
              className="flex w-full items-center gap-3.5 px-4.5 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] transition text-left text-sm font-semibold text-white border border-white/10 shadow-md"
            >
              {notifStatus === "enabled" ? (
                <>
                  <Bell className="h-4 w-4 text-cyan-400" /> <span className="text-white">Notifications on</span>
                </>
              ) : notifStatus === "enabling" ? (
                <>
                  <Bell className="h-4 w-4 animate-pulse text-slate-300" /> <span className="text-white">Enabling…</span>
                </>
              ) : notifStatus === "denied" ? (
                <>
                  <BellOff className="h-4 w-4 text-red-400" /> <span className="text-white">Permission denied</span>
                </>
              ) : notifStatus === "error" ? (
                <>
                  <BellOff className="h-4 w-4 text-red-400" /> <span className="text-white">Couldn't enable</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 text-cyan-400" /> <span className="text-white">Enable notifications</span>
                </>
              )}
            </button>

            <Link href="/about" onClick={() => setMenuOpen(false)} className="flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] transition text-sm font-semibold text-white border border-white/10 shadow-md">
              <Info className="h-4 w-4 text-cyan-400" /> 
              <span className="text-white">About Us</span>
            </Link>
            <Link href="/contact" onClick={() => setMenuOpen(false)} className="flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] transition text-sm font-semibold text-white border border-white/10 shadow-md">
              <Mail className="h-4 w-4 text-cyan-400" /> 
              <span className="text-white">Contact Us</span>
            </Link>
          </nav>
        </div>

        {/* LIQUID WATER GRADIENT BUTTON */}
        <div className="pt-6 border-t border-white/10">
          {session ? (
            <button type="button" onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-950/60 border border-red-500/30 px-4 py-4 text-xs font-clash font-bold uppercase tracking-widest text-red-400 hover:bg-red-900/60 transition shadow-lg">
              <LogOut className="h-4 w-4" /> <span className="text-red-400">Logout</span>
            </button>
          ) : (
            <Link 
              href="/login" 
              onClick={() => setMenuOpen(false)} 
              className="relative group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-4 py-4 text-xs font-clash font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] transition-all overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <User className="h-4 w-4 text-black" /> 
              <span className="text-black">Log In</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}