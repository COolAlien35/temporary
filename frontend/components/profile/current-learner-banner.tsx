"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSession } from "@/store/use-session"
import { useLearnerProgress } from "@/store/use-learner-progress"

export function CurrentLearnerBanner() {
  const [mounted, setMounted] = useState(false)
  const user = useSession((state) => state.user)
  const xp = useLearnerProgress((state) => state.xp)
  const lessons = useLearnerProgress((state) => state.lessonsCompleted.length)

  useEffect(() => setMounted(true), [])

  return <div className="rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[.06] p-5 text-sm text-white/70">
    <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#00D4FF]">Your browser-local demo progress</p>
    <p className="mt-2 font-medium text-white">{mounted && user ? user.name : "Guest explorer"} · {mounted ? xp : 0} XP · {mounted ? lessons : 0} lessons completed</p>
    <p className="mt-2 text-xs text-white/55">Lessons, assessments, local simulations, and streaks update this passport as you learn.</p>
    <Link href={mounted && user ? "/settings" : "/login?next=/me"} className="mt-3 inline-block text-xs font-semibold text-[#00D4FF]">{mounted && user ? "Manage demo profile" : "Create demo profile"} →</Link>
  </div>
}
