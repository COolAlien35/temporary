"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useCoursework } from "@/store/use-coursework"

export function InstructorCourseworkPulse() {
  const [mounted, setMounted] = useState(false)
  const assignments = useCoursework((state) => state.assignments)
  const submissions = useCoursework((state) => state.submissions)
  useEffect(() => setMounted(true), [])
  const published = mounted ? assignments.filter((item) => item.status === "published").length : 0
  const awaiting = mounted ? submissions.filter((item) => !item.instructorFeedback).length : 0

  return <section className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[.06] p-5"><div><p className="text-xs uppercase tracking-[.18em] text-[#00D4FF]">Your local teaching work</p><h2 className="mt-2 text-lg font-semibold">{published} published assignment{published === 1 ? "" : "s"} · {awaiting} response{awaiting === 1 ? "" : "s"} awaiting feedback</h2><p className="mt-1 text-xs text-white/50">These counts come from assignments and submissions in this browser. Cohort statistics below are examples.</p></div><Link href="/instructor/assignments" className="rounded-lg bg-[#00D4FF] px-4 py-2.5 text-sm font-semibold text-[#0A0E17]">Manage assignments →</Link></section>
}
