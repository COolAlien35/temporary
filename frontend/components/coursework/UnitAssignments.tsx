"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { canAccessAssignment } from "@/lib/coursework/types"
import { useCoursework } from "@/store/use-coursework"
import { useSession } from "@/store/use-session"

export function UnitAssignments({ unitId }: { unitId: string }) {
  const [mounted, setMounted] = useState(false)
  const user = useSession((state) => state.user)
  const assignments = useCoursework((state) => state.assignments)
  useEffect(() => setMounted(true), [])
  const related = mounted && user ? assignments.filter((assignment) => assignment.unitId === unitId && canAccessAssignment(assignment, user.email)) : []

  return <section className="mt-10 rounded-2xl border border-[#00D4FF]/20 bg-[#00D4FF]/[.04] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-[#00D4FF]">Instructor work</p><h2 className="mt-1 text-xl font-semibold">Assigned circuit studies</h2></div><Link href="/assignments" className="text-sm text-[#00D4FF]">View all assigned work →</Link></div>{related.length ? <div className="mt-4 grid gap-2">{related.map((assignment) => <Link key={assignment.id} href={`/assignments/${assignment.id}`} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/80 hover:border-[#00D4FF]/50">{assignment.title} · {assignment.questions.length} quiz questions</Link>)}</div> : <p className="mt-3 text-sm text-white/50">{mounted && user ? "No instructor assignment for this unit yet." : "Sign in to see assignments linked to this unit."}</p>}</section>
}
