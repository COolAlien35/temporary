"use client"

import Link from "next/link"
import { Clock3, Trophy, Users } from "lucide-react"
import { badges, contests, difficultyClass, statusClass, type ContestStatus } from "@/lib/contests"
import type { RankingRow } from "@/lib/community/rankings"

const shell = "rounded-2xl border border-white/10 bg-white/[0.035]"

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="text-xs uppercase tracking-[.25em] text-[#00D4FF]">{eyebrow}</p>}<h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h2></div>{action}</div>
}

export function ContestCard({ contest, featured = false }: { contest: (typeof contests)[number]; featured?: boolean }) {
  return <article className={`${shell} ${featured ? "min-w-[300px]" : "min-w-0"} p-5`}><div className="flex items-start justify-between gap-3"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClass(contest.status)}`}>{contest.status}</span><span className={`text-xs font-medium ${difficultyClass(contest.difficulty)}`}>{contest.difficulty}</span></div><h3 className="mt-5 text-lg font-semibold text-white">{contest.title}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-white/55">{contest.description}</p><div className="mt-4 flex items-center gap-4 text-xs text-white/45"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{contest.countdown}</span><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{contest.participants} sample participants</span></div><Link href={`/contests/${contest.id}`} className="mt-5 flex items-center justify-center rounded-xl border border-[#00D4FF]/40 bg-[#00D4FF]/10 px-3 py-2 text-sm font-medium text-[#00D4FF] transition hover:bg-[#00D4FF]/20">{contest.status === "Ended" ? "View sample results" : "View contest"} →</Link></article>
}

export function Podium({ rows, scoreLabel }: { rows: RankingRow[]; scoreLabel: string }) {
  if (!rows.length) return <p className={`${shell} p-5 text-sm text-white/50`}>No results for this filter.</p>
  return <div className="grid gap-3 md:grid-cols-3">{rows.slice(0, 3).map((entry, index) => <div key={entry.id} className={`${shell} p-5 ${index === 0 ? "border-[#F5B942]/35" : ""}`}><div className="flex items-center justify-between"><span className="text-2xl font-semibold text-[#F5B942]">#{entry.rank}</span><Trophy className="h-5 w-5 text-[#F5B942]" /></div><div className="mt-5 flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] text-sm font-bold text-[#07101a]">{entry.initials}</div><div><p className="font-medium text-white">{entry.name}</p><p className="text-xs text-white/45">{entry.score.toLocaleString()} {scoreLabel} · {entry.source === "sample" ? "Sample" : "Your browser"}</p></div></div></div>)}</div>
}

export function LeaderboardTable({ rows, scoreLabel }: { rows: RankingRow[]; scoreLabel: string }) {
  return <div className={`${shell} overflow-hidden`}>{rows.length === 0 ? <p className="p-5 text-sm text-white/50">No rankings for this selection yet.</p> : <><div className="grid grid-cols-[32px_minmax(0,1fr)_80px] gap-3 border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-wider text-white/35 sm:grid-cols-[48px_1fr_90px_110px]"><span>#</span><span>Explorer</span><span>{scoreLabel}</span><span className="hidden sm:block">Streak</span></div>{rows.map((entry) => <div key={entry.id} className={`grid grid-cols-[32px_minmax(0,1fr)_80px] items-center gap-3 border-b border-white/5 px-4 py-4 text-sm last:border-0 sm:grid-cols-[48px_1fr_90px_110px] ${entry.source === "local" ? "bg-[#00D4FF]/10" : ""}`}><span className="font-semibold text-white/50">{entry.rank}</span><div className="min-w-0"><p className="truncate font-medium text-white">{entry.name} <span className="text-xs font-normal text-white/40">· {entry.source === "sample" ? "Sample" : "You"}</span></p><p className="truncate text-[10px] text-white/35">{entry.badges.slice(0, 2).join(" · ")}</p></div><span className="text-white/70">{entry.score.toLocaleString()}</span><span className="hidden text-[#FFB800] sm:block">{entry.streak} days</span></div>)}</>}</div>
}

export function BadgeGrid() {
  return <div className="grid gap-3 sm:grid-cols-2">{badges.map(([name, description]) => <div key={name} className={`${shell} flex items-center gap-3 p-4`}><div className="flex size-10 items-center justify-center rounded-xl border border-[#F5B942]/30 bg-[#F5B942]/10 text-lg text-[#F5B942]">✦</div><div><p className="text-sm font-medium text-white">{name}</p><p className="text-xs text-white/45">Sample badge · {description}</p></div></div>)}</div>
}

export function FilterBar({ status, setStatus }: { status: ContestStatus | "All"; setStatus: (status: ContestStatus | "All") => void }) {
  return <div className="flex flex-wrap gap-2">{(["All", "Live", "Upcoming", "Ended"] as const).map((item) => <button key={item} type="button" onClick={() => setStatus(item)} aria-pressed={status === item} className={`rounded-lg border px-3 py-2 text-xs ${status === item ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/50 hover:text-white"}`}>{item}</button>)}</div>
}
