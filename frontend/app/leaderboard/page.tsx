"use client"

import { useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { BadgeGrid, LeaderboardTable, Podium, SectionTitle } from "@/components/contests/ContestUI"
import { contests } from "@/lib/contests"
import { rankingRows, type RankingPeriod, type RankingScope } from "@/lib/community/rankings"
import { units } from "@/lib/curriculum/units"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useSession } from "@/store/use-session"

export default function LeaderboardPage() {
  const [scope, setScope] = useState<RankingScope>("global")
  const [period, setPeriod] = useState<RankingPeriod>("all")
  const [contestId, setContestId] = useState("entanglement-speed")
  const [unitId, setUnitId] = useState("u1")
  const progress = useLearnerProgress()
  const learnerName = useSession((state) => state.user?.name ?? "Demo Explorer")
  const rows = rankingRows(scope, period, scope === "contest" ? contestId : unitId, progress, learnerName)
  const scoreLabel = scope === "global" ? "XP" : "%"

  return <AppShell variant="curriculum"><div className="mx-auto max-w-5xl px-5 py-10 text-white md:px-8"><p className="text-xs uppercase tracking-[.25em] text-[#00D4FF]">Community signal · sample rankings</p><h1 className="mt-3 text-4xl font-semibold">Leaderboard</h1><p className="mt-3 text-sm text-white/55">Sample explorers illustrate rankings. Your browser-local progress appears as a separate “You” row when you have a score in the selected view.</p>
    <div className="mt-8 flex flex-wrap gap-2" aria-label="Leaderboard scope">{(["global", "contest", "module"] as const).map((item) => <button key={item} type="button" onClick={() => setScope(item)} aria-pressed={scope === item} className={`rounded-lg border px-4 py-2 text-sm capitalize ${scope === item ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/55"}`}>{item === "module" ? "Learning module" : item}</button>)}</div>
    <div className="mt-3 flex flex-wrap items-end gap-3"><div className="flex gap-2" aria-label="Leaderboard period">{(["week", "all"] as const).map((item) => <button key={item} type="button" onClick={() => setPeriod(item)} aria-pressed={period === item} className={`rounded-lg border px-4 py-2 text-sm ${period === item ? "border-[#F5B942]/40 bg-[#F5B942]/10 text-[#F5B942]" : "border-white/10 text-white/55"}`}>{item === "week" ? "This week" : "All time"}</button>)}</div>{scope === "contest" && <label className="text-xs text-white/50">Contest<select value={contestId} onChange={(event) => setContestId(event.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-[#10141F] px-3 py-2 text-sm text-white">{contests.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}{scope === "module" && <label className="text-xs text-white/50">Module<select value={unitId} onChange={(event) => setUnitId(event.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-[#10141F] px-3 py-2 text-sm text-white">{units.slice(0, 3).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}</div>
    <div className="mt-10"><SectionTitle eyebrow={period === "week" ? "This week" : "All time"} title="Leading explorers" /><div className="mt-6"><Podium rows={rows} scoreLabel={scoreLabel} /></div></div><div className="mt-12"><SectionTitle title="All ranks" /><div className="mt-5"><LeaderboardTable rows={rows} scoreLabel={scoreLabel} /></div></div><div className="mt-12"><SectionTitle title="Sample badge guide" /><div className="mt-5"><BadgeGrid /></div></div>
  </div></AppShell>
}
