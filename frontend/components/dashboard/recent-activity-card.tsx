"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useLearnerProgress } from "@/store/use-learner-progress"

export function RecentActivityCard() {
  const [mounted, setMounted] = useState(false)
  const activities = useLearnerProgress((state) => state.activities)
  useEffect(() => setMounted(true), [])
  const recent = mounted ? activities.slice(0, 3) : []
  return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center justify-between"><h2 className="text-xs font-semibold text-white">Recent activity</h2><Link href="/me" className="text-[10px] text-[#00D4FF]">View all →</Link></div>{recent.length ? <ul className="mt-3 space-y-3">{recent.map((activity) => <li key={activity.id} className="border-t border-white/5 pt-2.5"><Link href={activity.href} className="text-xs font-medium text-white/80 hover:text-[#00D4FF]">{activity.title}</Link><p className="mt-1 text-[10px] text-white/40">{activity.details ?? activity.kind} · {new Date(activity.timestamp).toLocaleDateString()}</p></li>)}</ul> : <div className="mt-3 rounded-lg bg-black/20 p-3"><p className="text-xs text-white/65">Nothing recorded yet.</p><Link href="/curriculum" className="mt-1 inline-block text-[10px] text-[#00D4FF]">Start your first lesson →</Link></div>}</section>
}
