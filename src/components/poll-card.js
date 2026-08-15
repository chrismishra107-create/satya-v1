import Link from "next/link";

export function PollCard({ poll }) {
  const preview = poll.preview || "Prediction poll";

  return (
    <Link
      href={`/polls/${poll.id}`}
      className="block rounded-[28px] border border-slate-800 bg-slate-900/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-white/20"
    >
      <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{poll.status || "active"}</p>
      <h3 className="mt-3 text-xl font-semibold text-white">{preview}</h3>
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Subject</span>
          <span className="font-medium text-slate-200">{poll.subject || "—"}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Action</span>
          <span className="font-medium text-slate-200">{poll.action || "—"}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Deadline</span>
          <span className="font-medium text-slate-200">{poll.deadline || "—"}</span>
        </div>
      </div>
    </Link>
  );
}
