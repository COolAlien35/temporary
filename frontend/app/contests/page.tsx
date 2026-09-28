"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AppShell } from "@/components/shared/AppShell"
import { ContestCard, FilterBar, SectionTitle } from "@/components/contests/ContestUI"
import { contests, type ContestStatus } from "@/lib/contests"
import { useCommunity } from "@/store/use-community"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useSession } from "@/store/use-session"

export default function ContestsPage() {
  const [status, setStatus] = useState<ContestStatus | "All">("All")
  const filtered = useMemo(() => status === "All" ? contests : contests.filter((contest) => contest.status === status), [status])
  const learnerId = useSession((state) => state.user?.id ?? "demo-learner")
  const xp = useLearnerProgress((state) => state.xp)
  const badges = useLearnerProgress((state) => state.badges)
  const entries = useCommunity((state) => state.entries)
  const joined = entries.filter((item) => item.learnerId === learnerId).length

  return <AppShell variant="curriculum"><div className="mx-auto max-w-7xl px-5 py-10 text-white md:px-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="text-xs uppercase tracking-[.25em] text-[#00D4FF]">Community arena · frontend demo</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Contests</h1><p className="mt-3 text-white/55">Join the supported Bell-pair demo contest, submit a local circuit, and compare your result with clearly labeled sample rankings.</p></div><Link href="/contests/practice" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#F5B942]/40 bg-[#F5B942]/10 px-4 py-2.5 text-sm font-semibold text-[#F5B942]">Choose a practice track</Link></div>
    <section className="mt-10"><SectionTitle eyebrow="Demo rounds" title="Live contest previews" /><div className="mt-5 flex gap-4 overflow-x-auto pb-3">{contests.filter((contest) => contest.status === "Live").map((contest) => <ContestCard key={contest.id} contest={contest} featured />)}</div></section>
    <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_280px]"><section><SectionTitle title="All contests" action={<FilterBar status={status} setStatus={setStatus} />} /><div className="mt-5 grid gap-4 sm:grid-cols-2">{filtered.map((contest) => <ContestCard key={contest.id} contest={contest} />)}</div></section><aside className="h-fit rounded-2xl border border-[#00D4FF]/20 bg-[#00D4FF]/5 p-5"><p className="text-xs uppercase tracking-[.2em] text-[#00D4FF]">Your local stats</p><p className="mt-5 text-3xl font-semibold">{xp.toLocaleString()} <span className="text-sm font-normal text-white/45">XP</span></p><div className="mt-5 grid grid-cols-2 gap-3"><div><p className="text-xl font-semibold">{joined}</p><p className="text-xs text-white/45">Demo entries</p></div><div><p className="text-xl font-semibold">{badges.length}</p><p className="text-xs text-white/45">Badges earned</p></div></div><Link href="/me" className="mt-6 block text-sm text-[#00D4FF]">View Quantum Passport →</Link></aside></div>
  </div></AppShell>
}
