"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { platformServices } from "@/lib/services"
import { useCommunity } from "@/store/use-community"
import { useSession } from "@/store/use-session"

type Sort = "Top" | "New" | "Most Replies"

export function DiscussionList({ contestId = null }: { contestId?: string | null }) {
  const router = useRouter()
  const user = useSession((state) => state.user)
  const threads = useCommunity((state) => state.threads)
  const replies = useCommunity((state) => state.replies)
  const votes = useCommunity((state) => state.votes)
  const [sort, setSort] = useState<Sort>("Top")
  const [compose, setCompose] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tag, setTag] = useState("Question")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const voterId = user?.id ?? "demo-learner"
  const visible = useMemo(() => threads.filter((item) => !contestId || item.contestId === contestId).map((item) => ({
    ...item, voteCount: item.baseVotes + (votes[item.id]?.length ?? 0), replyCount: item.baseReplies + replies.filter((reply) => reply.threadId === item.id).length,
  })).sort((a, b) => sort === "New" ? b.createdAt - a.createdAt : sort === "Most Replies" ? b.replyCount - a.replyCount || b.createdAt - a.createdAt : b.voteCount - a.voteCount || b.createdAt - a.createdAt), [contestId, replies, sort, threads, votes])

  async function create() {
    if (title.trim().length < 5 || body.trim().length < 10) { setError("Add a title of at least 5 characters and a post of at least 10 characters."); return }
    setPending(true); setError("")
    try {
      const result = await platformServices.community.createThread({ title: title.trim(), body: body.trim(), contestId, tags: [tag], authorId: user?.id ?? null, authorName: user?.name ?? "Guest learner" })
      setCompose(false); setTitle(""); setBody("")
      router.push(`/discussions/${result.id}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not publish this thread. Please retry.") }
    finally { setPending(false) }
  }

  async function vote(id: string) {
    try { await platformServices.community.toggleVote(id, voterId); setError("") }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this vote.") }
  }

  return <div className="space-y-3"><div className="flex flex-wrap gap-2" aria-label="Discussion controls">{(["Top", "New", "Most Replies"] as const).map((item) => <button key={item} type="button" onClick={() => setSort(item)} aria-pressed={sort === item} className={`rounded-lg border px-3 py-2 text-xs ${sort === item ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50"}`}>{item}</button>)}<button type="button" onClick={() => setCompose(true)} className="ml-auto rounded-lg bg-[#00D4FF] px-4 py-2 text-xs font-semibold text-[#07101a]">New Thread</button></div>
    {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    {visible.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/50">No threads here yet. Start the conversation.</p>}
    {visible.map((thread) => <article key={thread.id} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4"><button type="button" aria-label={`${votes[thread.id]?.includes(voterId) ? "Remove vote from" : "Upvote"} ${thread.title}`} aria-pressed={votes[thread.id]?.includes(voterId) ?? false} onClick={() => vote(thread.id)} className={`flex min-w-8 flex-col items-center text-xs ${votes[thread.id]?.includes(voterId) ? "text-[#00D4FF]" : "text-white/45"}`}>▲<span>{thread.voteCount}</span></button><div className="min-w-0 flex-1"><Link href={`/discussions/${thread.id}`} className="font-medium text-white hover:text-[#00D4FF]">{thread.title}</Link><p className="mt-1 text-xs text-white/45">{thread.authorName} · {thread.sample ? "Sample post · " : ""}{new Date(thread.createdAt).toLocaleDateString()}</p><div className="mt-3 flex flex-wrap gap-2">{thread.tags.map((item) => <span key={item} className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/50">{item}</span>)}</div></div><span className="text-xs text-white/40">{thread.replyCount} repl{thread.replyCount === 1 ? "y" : "ies"}</span></article>)}
    {compose && <div role="dialog" aria-modal="true" aria-label="Create a discussion thread" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#10141F] p-6 text-white"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">New discussion thread</h3><button type="button" onClick={() => { setCompose(false); setError("") }} aria-label="Close thread composer" className="text-white/60">✕</button></div><p className="mt-2 text-sm text-white/50">{contestId ? "This thread will appear in the selected contest discussion." : "Share a question or a circuit idea with this browser's demo community."}</p><label className="mt-5 block text-sm">Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 p-3 outline-none focus:border-[#00D4FF]" /></label><label className="mt-4 block text-sm">Post<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 p-3 outline-none focus:border-[#00D4FF]" /></label><label className="mt-4 block text-sm">Topic<select value={tag} onChange={(event) => setTag(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#10141F] p-3"><option>Question</option><option>Strategy</option><option>Bug</option></select></label>{error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}<div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setCompose(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Cancel</button><button type="button" disabled={pending} onClick={create} className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a] disabled:opacity-50">{pending ? "Publishing…" : "Publish thread"}</button></div></div></div>}
  </div>
}
