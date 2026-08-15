"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const confidenceOptions = [
  { key: "low", label: "Low", stakes: 20 },
  { key: "medium", label: "Medium", stakes: 50 },
  { key: "high", label: "High", stakes: 100 },
];

export default function PollDetailPage({ params }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState(null);
  const [confidence, setConfidence] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const selectedConfidence = useMemo(
    () => confidenceOptions.find((option) => option.key === confidence) || confidenceOptions[1],
    [confidence]
  );

  useEffect(() => {
    async function loadPoll() {
      const response = await fetch("/api/polls");
      const data = await response.json();
      const match = (data || []).find((item) => item.id === params.id);
      setPoll(match || null);
      setLoading(false);
    }

    async function loadComments() {
      const response = await fetch(`/api/comments?poll_id=${params.id}`);
      const data = await response.json();
      setComments(data || []);
    }

    loadPoll();
    loadComments();
  }, [params.id]);

  const handleVote = async () => {
    if (choice === null) {
      setMessage("Please pick YES or NO first.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poll_id: poll.id, choice, confidence, user_id: "demo-user" }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to submit vote.");
      }

      setMessage(`Vote locked in: ${choice ? "YES" : "NO"} at ${selectedConfidence.label.toLowerCase()} confidence.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) {
      setMessage("Please write a comment first.");
      return;
    }

    setCommentLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poll_id: poll.id, text: commentText, user: "demo-user" }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to post comment.");
      }

      setCommentText("");
      const refreshed = await fetch(`/api/comments?poll_id=${poll.id}`);
      const nextComments = await refreshed.json();
      setComments(nextComments || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">Loading...</main>;
  }

  if (!poll) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-slate-800 bg-slate-900/90 p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Poll not found</p>
          <p className="mt-3 text-lg text-white">This poll is not available yet.</p>
          <Link href="/" className="mt-5 inline-flex rounded-3xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            Back to feed
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-5 rounded-[32px] border border-slate-800 bg-slate-900/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Prediction</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{poll.preview}</h1>
        </div>

        <div className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
          <p><span className="font-medium text-slate-200">Subject:</span> {poll.subject}</p>
          <p className="mt-2"><span className="font-medium text-slate-200">Action:</span> {poll.action}</p>
          <p className="mt-2"><span className="font-medium text-slate-200">Deadline:</span> {poll.deadline}</p>
          <p className="mt-2"><span className="font-medium text-slate-200">Resolution source:</span> {poll.resolution_source}</p>
        </div>

        <div className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-sm font-medium text-slate-300">Cast your vote</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button onClick={() => setChoice(true)} className={`rounded-3xl border px-4 py-3 text-sm font-semibold ${choice === true ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-slate-700 bg-slate-900 text-white"}`}>
              YES
            </button>
            <button onClick={() => setChoice(false)} className={`rounded-3xl border px-4 py-3 text-sm font-semibold ${choice === false ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-slate-700 bg-slate-900 text-white"}`}>
              NO
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {confidenceOptions.map((option) => (
              <button key={option.key} onClick={() => setConfidence(option.key)} className={`flex w-full items-center justify-between rounded-3xl border px-4 py-3 text-left text-sm ${confidence === option.key ? "border-white/20 bg-white/10 text-white" : "border-slate-700 bg-slate-900 text-slate-300"}`}>
                <span>{option.label}</span>
                <span>{option.stakes} credits</span>
              </button>
            ))}
          </div>

          <button onClick={handleVote} disabled={submitting} className="mt-4 w-full rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60">
            {submitting ? "Submitting vote..." : "Confirm vote"}
          </button>

          {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
        </div>

        <div className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-sm font-medium text-slate-300">Comments</p>
          <form onSubmit={handleCommentSubmit} className="mt-4 flex flex-col gap-3">
            <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={3} className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none" placeholder="Write a comment..." />
            <button type="submit" disabled={commentLoading} className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {commentLoading ? "Posting..." : "Post comment"}
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-400">No comments yet.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                    <span className="font-semibold text-white">{comment.user}</span>
                    <span>{comment.created_at ? new Date(comment.created_at).toLocaleString() : "just now"}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
