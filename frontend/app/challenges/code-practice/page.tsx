"use client"

import Link from "next/link"
import { useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { platformServices } from "@/lib/services"
import type { CodeGradeResult } from "@/lib/services/contracts"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useSession } from "@/store/use-session"

const challengeId = "code-bell-pair"

export default function CodePracticePage() {
  const learnerId = useSession((state) => state.user?.id ?? "demo-learner")
  const recordAttempt = useLearnerProgress((state) => state.recordAssessmentAttempt)
  const [code, setCode] = useState("# Prepare a Bell pair using your preferred quantum framework\n")
  const [result, setResult] = useState<CodeGradeResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!code.replace(/^\s*#.*$/gm, "").trim()) {
      setResult({ status: "failed", score: null, feedback: ["Enter a solution before submitting."] })
      return
    }
    setSubmitting(true)
    setResult(null)
    try {
      const graded = await platformServices.assessments.gradeCodeChallenge({ challengeId, learnerId, code })
      setResult(graded)
      if (graded.status === "pending" || graded.status === "graded") recordAttempt({
        id: graded.jobId ?? crypto.randomUUID(), assessmentId: challengeId, learnerId, kind: "code-challenge",
        score: graded.score, status: graded.status, passed: graded.status === "graded" ? (graded.score ?? 0) >= 70 : null,
        submittedAt: Date.now(), feedback: graded.feedback, snapshot: { code },
      })
    } catch (error) {
      setResult({ status: "failed", score: null, feedback: [error instanceof Error ? error.message : "The grading service could not be reached. Retry later."] })
    } finally {
      setSubmitting(false)
    }
  }

  return <AppShell variant="curriculum"><div className="mx-auto min-h-screen max-w-4xl px-5 py-10 text-white md:px-10">
    <Link href="/challenges" className="text-sm text-[#00D4FF]">← All challenges</Link>
    <p className="mt-8 text-xs uppercase tracking-[.22em] text-[#F5B942]">Code challenge · Entanglement</p>
    <h1 className="mt-3 text-4xl font-semibold">Prepare a Bell pair in code</h1>
    <p className="mt-4 max-w-2xl text-white/60">Write a program that initializes two qubits, applies H to the first qubit and CNOT from the first to the second, then measures both. Target outcomes are 00 and 11 at roughly equal probability.</p>
    <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-5 text-sm text-amber-100/80">Remote code grading is not connected in this frontend demo. Code entered here is never executed locally. Use the <Link href="/challenges/bell-pair" className="underline">circuit Bell pair challenge</Link> for an available graded exercise.</div>
    <label htmlFor="code-solution" className="mt-8 block text-sm font-medium">Your solution</label>
    <textarea id="code-solution" value={code} onChange={(event) => { setCode(event.target.value); setResult(null) }} rows={12} spellCheck={false} className="mt-3 w-full rounded-2xl border border-white/15 bg-[#10141F] p-5 font-mono text-sm text-white outline-none focus:border-[#00D4FF]" />
    <button type="button" disabled={submitting} onClick={submit} className="mt-4 min-h-11 rounded-xl bg-[#00D4FF] px-5 py-3 text-sm font-semibold text-[#0A0E17] disabled:opacity-50">{submitting ? "Checking grader…" : "Request remote grading"}</button>
    {result && <div role={result.status === "failed" ? "alert" : "status"} className={`mt-5 rounded-2xl border p-5 text-sm ${result.status === "failed" ? "border-rose-400/30 bg-rose-400/10 text-rose-100" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}><p className="font-semibold">{result.status === "pending" ? "Grading pending" : result.status === "graded" ? `Graded · ${result.score}%` : "Grading unavailable"}</p>{result.feedback.map((line) => <p key={line} className="mt-2">{line}</p>)}</div>}
  </div></AppShell>
}
