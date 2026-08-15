"use client";

import { useState } from "react";
import { MessageCircle, ThumbsUp, BadgeCheck } from "lucide-react";

type SampleComment = {
  id: string;
  user: string;
  text: string;
  time: string;
};

type PostData = {
  id: string;
  user: string;
  avatar: string;
  time: string;
  text: string;
  status: string;
  badgeColor: string;
  summary: string;
  comments: SampleComment[];
};

type PostCardProps = {
  post: PostData;
};

const badgeColors: Record<string, string> = {
  "Verified True": "bg-white/10 text-white border-white/20",
  "Misleading / Unverified": "bg-white/10 text-white border-white/20",
  "False / Debunked": "bg-white/10 text-white border-white/20",
  "Opinion / Non-Factual": "bg-white/10 text-white border-white/20",
};

export function PostCard({ post }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-[32px] border border-slate-800 bg-slate-950/95 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-xl text-white">
          {post.avatar}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="font-semibold text-slate-100">{post.user}</span>
            <span>{post.time}</span>
          </div>
          <p className="mt-4 text-lg leading-8 text-slate-100">{post.text}</p>

          <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${badgeColors[post.status] || badgeColors["Opinion / Non-Factual"]}`}>
              <BadgeCheck className="h-4 w-4" />
              <span>{post.status}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{post.summary}</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 transition hover:border-white/30 hover:text-white">
              <ThumbsUp className="h-4 w-4" /> Like
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 transition hover:border-white/30 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" /> {expanded ? "Hide" : "Comments"}
            </button>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-[900px]" : "max-h-0"}`}>
            {expanded ? (
              <div className="mt-5 space-y-3">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                      <span className="font-semibold text-slate-100">{comment.user}</span>
                      <span>{comment.time}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{comment.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
