"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { resolvePostLoginPath } from "@/lib/profile";
import { ShieldCheck, CheckCircle2, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false); 
  const router = useRouter();

  const progressPercent = (email ? 50 : 0) + (password ? 50 : 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      // Safely initialize the client right inside the submission handler
      const supabase = await createClient();

      if (!supabase || !supabase.auth) {
        throw new Error("Unable to connect to authentication service.");
      }

      if (isRegister) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccessMessage("Verification packet dispatched. Check your inbox.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
        } else {
          try {
            const nextPath = await resolvePostLoginPath(supabase);
            await router.push(nextPath);
            router.refresh();
          } catch {
            await router.push("/onboarding/category");
            router.refresh();
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700,900&display=swap');
        .font-clash { font-family: 'Clash Display', sans-serif; }
        .font-satoshi { font-family: 'Satoshi', sans-serif; }
      `}} />

      <main className="relative flex min-h-screen items-center justify-center bg-black px-4 py-8 overflow-hidden font-satoshi text-white">
        
        {/* Stealthy Ambient Orbs */}
        <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-cyan-600 filter blur-[160px] opacity-15"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-indigo-700 filter blur-[160px] opacity-15"></div>
        </div>

        {/* DARK GLASSMORPHISM CARD */}
        <div className="relative z-10 w-full max-w-[440px] bg-[#0c1222]/80 backdrop-blur-2xl rounded-[32px] p-10 sm:p-12 shadow-[0_25px_70px_rgba(0,0,0,0.9)] border border-white/10">
          
          {/* Top Bar with Icon & Larger Progress Bar */}
          <div className="mb-10 flex items-center justify-between">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="h-6 w-6 text-black" />
            </div>

            <div className="flex items-center gap-3 bg-black/50 px-4 py-2.5 rounded-full border border-white/10">
              <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">{progressPercent}%</span>
            </div>
          </div>

          {/* Text & Hook */}
          <div className="mb-10 space-y-3">
            <h1 className="text-3xl font-clash font-bold leading-[1.15] tracking-tight text-white">
              No political jargon.<br/><span className="text-cyan-400">Just facts.</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-400 leading-relaxed">
              Skip the noise. Calibrate your daily intelligence feed in 60 seconds.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-xs font-mono text-red-400 text-center backdrop-blur-md">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-xs font-mono text-emerald-400 text-center backdrop-blur-md flex flex-col items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              {successMessage}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Operative Email"
                className="w-full rounded-2xl border border-white/10 bg-black/40 pl-11 pr-5 py-4 text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:bg-black/60 transition-all shadow-inner"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Security Passcode"
                className="w-full rounded-2xl border border-white/10 bg-black/40 pl-11 pr-5 py-4 text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:bg-black/60 transition-all shadow-inner"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full rounded-2xl bg-cyan-400 py-4 text-[13px] font-clash font-bold uppercase tracking-widest text-black shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? "Authenticating..." : (isRegister ? "Establish Clearance" : "Enter Feed")}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-10 text-center border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setSuccessMessage("");
              }}
              className="text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {isRegister ? "Already authenticated? Access feed." : "New operative? Initialize profile."}
            </button>
          </div>

        </div>
      </main>
    </>
  );
}