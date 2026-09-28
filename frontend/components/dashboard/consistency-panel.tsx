"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { useLearnerProgress } from "@/store/use-learner-progress"

export function ConsistencyPanel() {
  const [mounted, setMounted] = useState(false)
  const days = useLearnerProgress((state) => state.activityDays)
  const streak = useLearnerProgress((state) => state.streak)
  const bestStreak = useLearnerProgress((state) => state.bestStreak)
  useEffect(() => setMounted(true), [])
  const active = new Set(days)
  const recentDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - index))
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  })

  return <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, ease: "easeOut" }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <h3 className="text-xs font-semibold text-white">Consistency · {mounted ? `${streak}-day current streak` : "Start building a streak"}</h3>
    <div className="mt-3 flex items-center gap-1" aria-label={`${mounted ? recentDays.filter((day) => active.has(day)).length : 0} active days in the last 14 days`}>
      {recentDays.map((day, index) => <motion.span key={day} title={day} initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.2, delay: 0.03 * index }} className={`h-2.5 w-2.5 rounded-full ${mounted && active.has(day) ? "bg-[#4ADE80]" : index === 13 ? "bg-[#00D4FF]/60" : "bg-white/10"}`} />)}
    </div>
    <p className="mt-2 text-[11px] text-white/40">{mounted ? bestStreak ? `Personal best: ${bestStreak} days.` : "Complete a lesson or experiment to begin your streak." : "Recent learning activity"}</p>
  </motion.section>
}
