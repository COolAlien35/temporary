"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { canAccessAssignment } from "@/lib/coursework/types"
import { useCoursework } from "@/store/use-coursework"
import { useSession } from "@/store/use-session"

export function AssignedWorkCard() {
  const [mounted, setMounted] = useState(false)
  const user = useSession((state) => state.user)
  const assignments = useCoursework((state) => state.assignments)
  const submissions = useCoursework((state) => state.submissions)
  useEffect(() => setMounted(true), [])
  const pending = mounted && user ? assignments.filter((assignment) => canAccessAssignment(assignment, user.email) && !submissions.some((submission) => submission.assignmentId === assignment.id && submission.learnerId === user.id)).length : 0

  return <Link href="/assignments" className="block rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[.06] p-4 transition hover:border-[#00D4FF]/60"><p className="text-xs uppercase tracking-[.18em] text-[#00D4FF]">Assigned work</p><p className="mt-2 text-lg font-semibold text-white">{mounted && user ? pending ? `${pending} awaiting your response` : "Your assignment inbox" : "Study and respond"}</p><p className="mt-1 text-xs leading-5 text-white/50">Open circuit studies and instructor quizzes →</p></Link>
}
