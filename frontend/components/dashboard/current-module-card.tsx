"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { TiltCard } from "@/components/quantumloop/tilt-card"
import { units } from "@/lib/curriculum/units"
import { getLearnerRecommendation } from "@/lib/learner-recommendation"
import { useLearnerProgress } from "@/store/use-learner-progress"

export function CurrentModuleCard() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const progress = useLearnerProgress((state) => state)
  const recommendation = mounted ? getLearnerRecommendation(progress) : { title: units[0].lessons[0].title, reason: "Start with the foundations. This lesson introduces qubits and measurement.", href: `/curriculum/${units[0].id}/${units[0].lessons[0].id}`, action: "Start first lesson" }
  const completed = mounted ? progress.lessonsCompleted.length : 0
  const total = units.reduce((count, unit) => count + unit.lessons.length, 0)
  const currentUnit = units.find((unit) => unit.lessons.some((lesson) => lesson.id === recommendation.href.split("/").pop()))

  return <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}>
    <TiltCard strength={4}><section className="home-glow-card relative overflow-hidden rounded-2xl border border-white/10 border-l-2 border-l-[#00D4FF] bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-[#00D4FF]/10 px-2.5 py-1 text-[11px] font-medium text-[#00D4FF]">{completed ? `${completed} of ${total} lessons complete` : "Your learning path starts here"}</span><span className="text-xs text-white/40">{mounted ? progress.xp : 0} XP earned</span></div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[.2em] text-[#F5B942]">Recommended next{currentUnit ? ` · ${currentUnit.title}` : ""}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>{recommendation.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{recommendation.reason}</p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Lesson completion" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}><div className="h-full rounded-full bg-gradient-to-r from-[#00D4FF] to-[#4ADE80] transition-all" style={{ width: `${total ? Math.min(100, completed / total * 100) : 0}%` }} /></div>
      <div className="mt-5 flex flex-wrap gap-3"><Link href={recommendation.href} className="home-btn-sheen inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#4FD1E8] px-5 py-2.5 text-xs font-semibold text-[#0A0E17]">{recommendation.action} <span aria-hidden="true">→</span></Link><Link href="/curriculum" className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-medium text-white/65 hover:text-white">View curriculum</Link></div>
    </section></TiltCard>
  </motion.div>
}
