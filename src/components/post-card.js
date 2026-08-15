import { useState } from "react";
import { MessageCircle, ThumbsUp, ShieldCheck } from "lucide-react";

const badgeClasses = {
  "Verified True": "bg-white/10 text-white border-white/20",
  "Misleading / Unverified": "bg-white/10 text-white border-white/20",
  "False / Debunked": "bg-white/10 text-white border-white/20",
  "Opinion / Non-Factual": "bg-white/10 text-white border-white/20",
};

export function PostCard({ post }) {
  const [expanded, setExpanded] = useState(false);
  const comments = post.comments || [];
  const hasStatus = !!post.status || !!post.summary;
  const avatar = post.avatar || (post.user ? post.user[0]?.toUpperCase() : "S");

  return (
    <article className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-lg font-semibold text-white">
          {avatar}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="font-semibold text-slate-100">{post.user}</span>
            <span>{post.time}</span>
          </div>
          <p className="mt-4 text-lg leading-8 text-slate-100">{post.text}</p>

          {hasStatus ? (
            <div className="mt-5 rounded-[24px] border border-slate-800 bg-slate-900/90 p-4">
              {post.status ? (
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${badgeClasses[post.status] || badgeClasses["Opinion / Non-Factual"]}`}>
                  <ShieldCheck className="h-4 w-4" />
                  <span>{post.status}</span>
                </div>
              ) : null}
              {post.summary ? (
                <p className="mt-3 text-sm leading-6 text-slate-300">{post.summary}</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <button className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 transition hover:border-white/30 hover:text-white">
              <ThumbsUp className="h-4 w-4" /> Like
            </button>
            {comments.length > 0 ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 transition hover:border-white/30 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" /> {expanded ? "Hide" : "Comments"}
              </button>
            ) : null}
          </div>

          {comments.length > 0 ? (
            <div className={`mt-4 overflow-hidden transition-all duration-300 ${expanded ? "max-h-[900px]" : "max-h-0"}`}>
              {expanded && (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                      <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                        <span className="font-semibold text-slate-100">{comment.user}</span>
                        <span>{comment.time}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
