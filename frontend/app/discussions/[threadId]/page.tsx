"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { contests } from "@/lib/contests"
import { platformServices } from "@/lib/services"
import { useCommunity } from "@/store/use-community"
import { useSession } from "@/store/use-session"

export default function DiscussionThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const user = useSession((state) => state.user)
  const threads = useCommunity((state) => state.threads)
  const replies = useCommunity((state) => state.replies)
  const votes = useCommunity((state) => state.votes)
  const thread = threads.find((item) => item.id === threadId)
  const [reply, setReply] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  if (!thread) return <AppShell variant="curriculum"><div className="mx-auto max-w-4xl px-5 py-16 text-white"><h1 className="text-3xl font-semibold">Thread not found</h1><p className="mt-3 text-white/55">This discussion is not in the current browser.</p><Link href="/discussions" className="mt-5 inline-block text-[#00D4FF]">Back to discussions →</Link></div></AppShell>
  const localReplies = replies.filter((item) => item.threadId === thread.id).sort((a, b) => a.createdAt - b.createdAt)
  const voterId = user?.id ?? "demo-learner"
  const voted = votes[thread.id]?.includes(voterId) ?? false
  const contest = contests.find((item) => item.id === thread.contestId)

  async function vote() {
    try { await platformServices.community.toggleVote(thread!.id, voterId); setError("") }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your vote.") }
  }

  async function submitReply() {
    if (reply.trim().length < 5) { setError("Write at least 5 characters before posting your reply."); return }
    setPending(true); setError("")
    try {
      await platformServices.community.addReply({ threadId: thread!.id, authorId: user?.id ?? null, authorName: user?.name ?? "Guest learner", body: reply.trim() })
      setReply("")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not post your reply. Please retry.") }
    finally { setPending(false) }
  }

  return <AppShell variant="curriculum"><div className="mx-auto max-w-4xl px-5 py-10 text-white md:px-8"><Link href={contest ? `/contests/${contest.id}` : "/discussions"} className="text-sm text-[#00D4FF]">← {contest ? contest.title : "Discussions"}</Link><article className="mt-7 rounded-2xl border border-white/10 bg-white/[.035] p-6"><div className="flex flex-wrap gap-2">{thread.tags.map((tag) => <span key={tag} className="rounded-md bg-[#00D4FF]/10 px-2 py-1 text-xs text-[#00D4FF]">{tag}</span>)}{contest && <span className="rounded-md bg-amber-300/10 px-2 py-1 text-xs text-amber-200">{contest.title}</span>}</div><h1 className="mt-4 text-3xl font-semibold">{thread.title}</h1><p className="mt-2 text-xs text-white/45">{thread.authorName} · {thread.sample ? "Sample post · " : ""}{new Date(thread.createdAt).toLocaleString()}</p><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/75">{thread.body}</p><button type="button" onClick={vote} aria-pressed={voted} className={`mt-5 rounded-lg border px-4 py-2 text-sm ${voted ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/15 text-white/65"}`}>▲ {thread.baseVotes + (votes[thread.id]?.length ?? 0)} · {voted ? "Remove vote" : "Upvote"}</button></article>
    <section className="mt-8"><h2 className="text-xl font-semibold">Replies</h2>{thread.baseReplies > 0 && <p className="mt-3 rounded-xl border border-white/10 p-4 text-sm text-white/45">{thread.baseReplies} sample repl{thread.baseReplies === 1 ? "y" : "ies"} are represented in the count; their text is not available in this demo.</p>}{localReplies.length === 0 && thread.baseReplies === 0 && <p className="mt-3 text-sm text-white/45">No replies yet. Start the conversation.</p>}<div className="mt-4 space-y-3">{localReplies.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-white/[.03] p-5"><p className="text-xs text-white/45">{item.authorName} · {new Date(item.createdAt).toLocaleString()}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/75">{item.body}</p></article>)}</div></section>
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-lg font-semibold">Write a reply</h2><label htmlFor="thread-reply" className="mt-3 block text-sm text-white/50">Your response</label><textarea id="thread-reply" rows={4} value={reply} onChange={(event) => setReply(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#10141F] p-3 text-sm text-white outline-none focus:border-[#00D4FF]" />{error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}<button type="button" disabled={pending} onClick={submitReply} className="mt-4 rounded-lg bg-[#00D4FF] px-5 py-3 text-sm font-semibold text-[#07101a] disabled:opacity-50">{pending ? "Posting…" : "Post reply"}</button></section><p className="mt-5 text-xs text-white/35">Posts, replies and votes are saved only in this browser's demo community.</p>
  </div></AppShell>
}
