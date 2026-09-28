"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/shared/AppShell"
import { DiscussionList } from "@/components/community/DiscussionList"
import { LeaderboardTable, SectionTitle } from "@/components/contests/ContestUI"
import { contests, difficultyClass, statusClass } from "@/lib/contests"
import { rankingRows } from "@/lib/community/rankings"
import { platformServices } from "@/lib/services"
import { useCommunity } from "@/store/use-community"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useSession } from "@/store/use-session"

type Tab = "Overview" | "Leaderboard" | "Discussion" | "Submissions"

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const contest = contests.find((item) => item.id === id)
  const [tab, setTab] = useState<Tab>("Overview")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const learnerId = useSession((state) => state.user?.id ?? "demo-learner")
  const learnerName = useSession((state) => state.user?.name ?? "Demo Explorer")
  const entries = useCommunity((state) => state.entries)
  const progress = useLearnerProgress()
  if (!contest) return <AppShell variant="curriculum"><div className="mx-auto max-w-4xl px-5 py-16 text-white"><h1 className="text-3xl font-semibold">Contest not found</h1><p className="mt-3 text-white/55">This contest is not in the demo catalog.</p><Link href="/contests" className="mt-5 inline-block text-[#00D4FF]">Back to contests →</Link></div></AppShell>
  const joined = entries.some((item) => item.contestId === contest.id && item.learnerId === learnerId)
  const ownAttempts = (progress.challengeAttempts ?? []).filter((item) => item.contestId === contest.id && item.learnerId === learnerId).sort((a, b) => b.submittedAt - a.submittedAt)
  const rows = rankingRows("contest", "all", contest.id, progress, learnerName)

  async function enter() {
    if (!contest?.challengeId || contest.status !== "Live") return
    setPending(true); setError("")
    try { await platformServices.community.enterContest(contest.id, learnerId); setTab("Submissions") }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not join this demo contest. Please retry.") }
    finally { setPending(false) }
  }

  return <AppShell variant="curriculum"><div className="mx-auto max-w-5xl px-5 py-10 text-white md:px-8"><Link href="/contests" className="text-sm text-[#00D4FF]">← All contests</Link><div className="mt-6 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(contest.status)}`}>{contest.status}</span><span className={`text-xs ${difficultyClass(contest.difficulty)}`}>{contest.difficulty}</span><span className="text-xs text-white/40">Sample contest · browser-local entry</span></div><h1 className="mt-5 text-4xl font-semibold tracking-tight">{contest.title}</h1><p className="mt-3 max-w-2xl text-white/55">{contest.description}</p><p className="mt-5 text-sm text-white/45">{contest.countdown} · {contest.participants} sample participants</p>
    <div className="mt-8 flex flex-wrap gap-3">{contest.status === "Live" && contest.challengeId ? <button type="button" disabled={pending} onClick={joined ? () => setTab("Submissions") : enter} className="rounded-xl bg-[#00D4FF] px-5 py-3 text-sm font-semibold text-[#07101a] disabled:opacity-50">{pending ? "Joining…" : joined ? "View your submissions" : "Enter demo contest"}</button> : contest.status === "Ended" ? <button type="button" onClick={() => setTab("Leaderboard")} className="rounded-xl bg-[#00D4FF] px-5 py-3 text-sm font-semibold text-[#07101a]">View sample results</button> : <span className="rounded-xl border border-amber-300/25 bg-amber-300/5 px-5 py-3 text-sm text-amber-100">{contest.status === "Upcoming" ? "Entry is not open in this demo." : "Graded entry needs a noise service."}</span>}<Link href="/leaderboard" className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/70">Global leaderboard</Link></div>{error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
    <div className="mt-10 flex gap-1 overflow-x-auto border-b border-white/10" role="tablist" aria-label="Contest sections">{(["Overview", "Leaderboard", "Discussion", "Submissions"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm ${tab === item ? "border-[#00D4FF] text-[#00D4FF]" : "border-transparent text-white/45"}`}>{item}</button>)}</div>
    <div className="mt-8" role="tabpanel">{tab === "Overview" && <div className="grid gap-5 md:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><SectionTitle title="Challenge brief" /><p className="mt-4 leading-7 text-white/60">{contest.problem}</p></section><section className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><SectionTitle title="Scoring" /><ul className="mt-4 space-y-3 text-sm text-white/60">{contest.rules.map((rule) => <li key={rule}>• {rule}</li>)}</ul></section></div>}
      {tab === "Leaderboard" && <><p className="mb-4 text-sm text-white/50">Illustrative sample scores; your submitted local circuit appears as a separate “You” row.</p><LeaderboardTable rows={rows} scoreLabel="%" /></>}
      {tab === "Discussion" && <DiscussionList contestId={contest.id} />}
      {tab === "Submissions" && (!contest.challengeId ? <p className="rounded-xl border border-white/10 p-5 text-sm text-white/55">No supported submission workflow is available for this contest in the frontend demo.</p> : !joined ? <p className="rounded-xl border border-white/10 p-5 text-sm text-white/55">Enter the demo contest above to submit a circuit.</p> : <div><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Your contest submissions</h2><Link href={`/challenges/${contest.challengeId}?contest=${contest.id}`} className="rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#07101a]">{ownAttempts.length ? "Try another circuit" : "Start contest challenge"} →</Link></div>{ownAttempts.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/50">No circuit submitted yet. Your attempt will appear here after local grading.</p> : <div className="mt-5 space-y-3">{ownAttempts.map((attempt) => <Link key={attempt.id} href={`/challenges/${attempt.challengeId}/attempts/${attempt.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] p-5 hover:border-[#00D4FF]/35"><div><p className="font-medium">{attempt.passed ? "Target met" : "Keep practicing"} · {attempt.circuit.gates.length} gates</p><p className="mt-1 text-xs text-white/45">Submitted {new Date(attempt.submittedAt).toLocaleString()}</p></div><span className="text-[#00D4FF]">{attempt.score}% · Review →</span></Link>)}</div>}</div>)}
    </div>
  </div></AppShell>
}
