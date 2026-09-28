"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { useLearnerProgress } from "@/store/use-learner-progress"

export function ActivityTimeline() {
  const reduceMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const activities = useLearnerProgress((state) => state.activities)
  useEffect(() => setMounted(true), [])
  const visibleActivities = mounted ? activities : []

  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>Your learning activity</h3>
    <p className="mt-1 text-xs text-white/45">Lessons, quiz attempts, challenges and local simulations recorded in this browser.</p>
    {visibleActivities.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-black/15 p-5"><p className="text-sm font-medium text-white/75">Your activity will show up here.</p><p className="mt-1 text-xs leading-5 text-white/45">Complete a lesson, run a circuit or submit an assessment to start your history.</p><Link href="/curriculum" className="mt-3 inline-block text-xs font-semibold text-[#00D4FF]">Start learning →</Link></div> : <ol className="relative mt-5 flex flex-col gap-3 border-l border-white/10 pl-5" aria-label="Recent learner activity">
      {visibleActivities.slice(0, 8).map((activity, index) => <motion.li key={activity.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: reduceMotion ? 0 : index * 0.04 }} className="relative rounded-xl border border-white/10 bg-black/20 p-4"><span className="absolute -left-[25px] top-5 size-2 rounded-full bg-[#00D4FF]" /><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium text-white">{activity.title}</p><p className="mt-1 text-xs text-white/45">{activity.details ?? activity.kind}</p></div><time className="text-[10px] text-white/40" dateTime={new Date(activity.timestamp).toISOString()}>{new Date(activity.timestamp).toLocaleString()}</time></div><div className="mt-3 flex items-center gap-3 text-xs">{activity.score !== undefined && <span className={activity.score >= 70 ? "text-emerald-300" : "text-amber-300"}>{activity.score}% score</span>}{activity.xp > 0 && <span className="text-[#FFB800]">+{activity.xp} XP</span>}<Link href={activity.href} className="ml-auto text-[#00D4FF] hover:underline">Open →</Link></div></motion.li>)}
    </ol>}
  </section>
}
