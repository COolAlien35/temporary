"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AppShell } from "@/components/shared/AppShell"
import { CircuitStudy } from "@/components/coursework/CircuitStudy"
import { circuitForSource } from "@/lib/coursework/circuits"
import type { AssignmentInput, CourseworkQuestion } from "@/lib/coursework/types"
import { units } from "@/lib/curriculum/units"
import { TEMPLATES } from "@/lib/studio/templates"
import { useCoursework } from "@/store/use-coursework"
import { useStudio } from "@/store/use-studio"
import { useAssessmentTemplates } from "@/store/use-assessment-templates"
import type { StudioCircuit } from "@/lib/studio/types"

const field = "mt-2 w-full rounded-lg border border-white/15 bg-[#10141F] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00D4FF]"
const newQuestion = (): CourseworkQuestion => ({ id: crypto.randomUUID(), prompt: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" })

export default function InstructorAssignmentsPage() {
  const [mounted, setMounted] = useState(false)
  const assignments = useCoursework((state) => state.assignments)
  const createDraft = useCoursework((state) => state.createDraft)
  const updateDraft = useCoursework((state) => state.updateDraft)
  const publish = useCoursework((state) => state.publish)
  const duplicateAsDraft = useCoursework((state) => state.duplicateAsDraft)
  const savedCircuits = useStudio((state) => state.savedCircuits)
  const currentCircuit = useStudio((state) => state.circuit)
  const templates = useAssessmentTemplates((state) => state.templates)
  const loadedTemplateRef = useRef<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [unitId, setUnitId] = useState("u3")
  const [instructions, setInstructions] = useState("")
  const [circuitSource, setCircuitSource] = useState("template:bell")
  const [templateCircuit, setTemplateCircuit] = useState<StudioCircuit | null>(null)
  const [questions, setQuestions] = useState<CourseworkQuestion[]>([{ id: "new-question-1", prompt: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }])
  const [reflectionPrompt, setReflectionPrompt] = useState("")
  const [exerciseKind, setExerciseKind] = useState<"quiz" | "code" | "debug">("quiz")
  const [starterCode, setStarterCode] = useState("")
  const [audience, setAudience] = useState<"all" | "email">("all")
  const [targetEmail, setTargetEmail] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const circuit = circuitSource.startsWith("assessment:") ? templateCircuit ?? (editingId ? assignments.find((assignment) => assignment.id === editingId)?.circuit ?? null : null) : circuitForSource(circuitSource, savedCircuits, currentCircuit) ?? (editingId ? assignments.find((assignment) => assignment.id === editingId)?.circuit ?? null : null)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    const id = new URLSearchParams(window.location.search).get("template")
    if (!id || loadedTemplateRef.current === id) return
    const template = templates.find((item) => item.id === id)
    if (!template) return
    loadedTemplateRef.current = id
    setEditingId(null); setTitle(template.title); setUnitId(template.unitId); setInstructions(template.instructions)
    setCircuitSource(`assessment:${id}`); setTemplateCircuit(structuredClone(template.circuit)); setQuestions(structuredClone(template.questions)); setReflectionPrompt(template.reflectionPrompt)
    setExerciseKind(template.kind); setStarterCode(template.starterCode ?? "")
    setMessage("Reusable assessment loaded. Choose an audience and publish a fixed assignment copy.")
  }, [mounted, templates])

  function resetForm() {
    setEditingId(null); setTitle(""); setUnitId("u3"); setInstructions(""); setCircuitSource("template:bell"); setTemplateCircuit(null)
    setQuestions([newQuestion()]); setReflectionPrompt(""); setExerciseKind("quiz"); setStarterCode(""); setAudience("all"); setTargetEmail(""); setDueDate(""); setPreviewOpen(false); setError(""); setMessage("")
  }

  function edit(id: string) {
    const item = useCoursework.getState().assignments.find((assignment) => assignment.id === id && assignment.status === "draft")
    if (!item) return
    setEditingId(id); setTitle(item.title); setUnitId(item.unitId); setInstructions(item.instructions); setCircuitSource(item.circuitSource); setTemplateCircuit(item.circuitSource.startsWith("assessment:") ? structuredClone(item.circuit) : null)
    setQuestions(structuredClone(item.questions)); setReflectionPrompt(item.reflectionPrompt); setExerciseKind(item.exerciseKind ?? "quiz"); setStarterCode(item.starterCode ?? ""); setAudience(item.audience)
    setTargetEmail(item.targetEmail ?? ""); setDueDate(item.dueDate ?? ""); setError(""); setMessage("Editing saved draft.")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function changeQuestion(index: number, changes: Partial<CourseworkQuestion>) {
    setQuestions((current) => current.map((question, position) => position === index ? { ...question, ...changes } : question))
  }

  function save(publishNow: boolean) {
    setError(""); setMessage("")
    if (!circuit) return setError("Choose a circuit to study.")
    if (title.trim().length < 5 || instructions.trim().length < 10) return setError("Add a title and clear study instructions.")
    if (questions.length === 0 || questions.some((question) => !question.prompt.trim() || question.options.some((option) => !option.trim()) || !question.explanation.trim())) return setError("Complete every question, all four answers, and its explanation.")
    if (!reflectionPrompt.trim()) return setError("Add a written response prompt.")
    if (audience === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail.trim())) return setError("Enter the learner email to receive this assignment.")
    const input: AssignmentInput = { title: title.trim(), unitId, instructions: instructions.trim(), circuit: structuredClone(circuit), circuitSource, questions: structuredClone(questions), reflectionPrompt: reflectionPrompt.trim(), exerciseKind, starterCode: exerciseKind === "code" ? starterCode : undefined, audience, targetEmail: audience === "email" ? targetEmail.trim().toLowerCase() : undefined, dueDate: dueDate || undefined }
    const id = editingId ?? createDraft(input)
    if (editingId) updateDraft(id, input)
    if (publishNow) { publish(id); resetForm(); setMessage("Assignment published to the selected demo learners in this browser.") }
    else { setEditingId(id); setMessage("Draft saved in this browser. It is not visible to learners yet.") }
  }

  return <AppShell variant="instructor"><div className="mx-auto max-w-5xl py-6">
    <Link href="/instructor" className="text-sm text-[#00D4FF]">← Instructor overview</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.2em] text-[#F5B942]">Instructor demo tools</p><h1 className="mt-2 text-3xl font-semibold">Assignments</h1></div><Link href="/assignments" className="text-sm text-[#00D4FF]">Open learner inbox →</Link></div>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Create a circuit study task, add quiz questions and a written response, then publish it. <Link href="/instructor/assessments" className="text-[#00D4FF]">Reusable assessments</Link> can fill this form. Assignments and responses are shared only between demo profiles in this browser.</p>

    <form onSubmit={(event) => { event.preventDefault(); save(false) }} className="mt-8 space-y-7 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{editingId ? "Edit draft" : "Create assignment"}</h2><div className="flex gap-4"><button type="button" onClick={() => setPreviewOpen((open) => !open)} className="text-xs text-[#00D4FF]">{previewOpen ? "Hide learner preview" : "Preview learner view"}</button>{editingId && <button type="button" onClick={resetForm} className="text-xs text-[#00D4FF]">New assignment</button>}</div></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="assignment-title" className="text-sm text-white/75">Title</label><input id="assignment-title" required minLength={5} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Study a Bell-state circuit" className={field} /></div><div><label htmlFor="assignment-unit" className="text-sm text-white/75">Related curriculum unit</label><select id="assignment-unit" value={unitId} onChange={(event) => setUnitId(event.target.value)} className={field}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}</option>)}</select></div></div>
      <div><label htmlFor="assignment-kind" className="text-sm text-white/75">Exercise type</label><select id="assignment-kind" value={exerciseKind} onChange={(event) => setExerciseKind(event.target.value as typeof exerciseKind)} className={field}><option value="quiz">Circuit quiz</option><option value="code">Code response + quiz</option><option value="debug">Debug exercise + quiz</option></select></div>
      <div><label htmlFor="assignment-instructions" className="text-sm text-white/75">Study instructions</label><textarea id="assignment-instructions" required minLength={10} rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Examine the gates and predict the measurement pattern before answering." className={field} /></div>
      <div><label htmlFor="assignment-circuit" className="text-sm text-white/75">Circuit for learners to study</label><select id="assignment-circuit" value={circuitSource} onChange={(event) => { setCircuitSource(event.target.value); if (!event.target.value.startsWith("assessment:")) setTemplateCircuit(null) }} className={field}>{circuitSource.startsWith("assessment:") && <option value={circuitSource}>Assessment template snapshot</option>}<optgroup label="Built-in templates">{TEMPLATES.map((template) => <option key={template.key} value={`template:${template.key}`}>{template.name}</option>)}</optgroup><optgroup label="Your Circuit Studio"><option value="current" disabled={currentCircuit.gates.length === 0}>Current Studio circuit{currentCircuit.gates.length === 0 ? " (empty)" : ""}</option>{savedCircuits.map((saved) => <option key={saved.id} value={`saved:${saved.id}`}>Saved: {saved.name}</option>)}</optgroup></select><p className="mt-1 text-xs text-white/45">The circuit is copied into the assignment when saved, so later Studio edits do not change published work. <Link href="/studio" className="text-[#00D4FF]">Build a circuit in Studio →</Link></p>{circuit && <div className="mt-4"><CircuitStudy circuit={circuit} /></div>}</div>
      {exerciseKind === "code" && <div><label htmlFor="assignment-starter-code" className="text-sm text-white/75">Starter code (optional)</label><textarea id="assignment-starter-code" rows={5} value={starterCode} onChange={(event) => setStarterCode(event.target.value)} spellCheck={false} className={`${field} font-mono`} /><p className="mt-1 text-xs text-white/45">Learners submit code text for manual review. The demo does not execute it.</p></div>}
      <div><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Quiz questions</h3><button type="button" onClick={() => setQuestions((current) => [...current, newQuestion()])} className="rounded-lg border border-[#00D4FF]/40 px-3 py-2 text-xs font-semibold text-[#00D4FF]">Add question</button></div><p className="mt-1 text-xs text-white/45">Multiple-choice answers are scored in the demo. Explanations are shown after submission.</p><div className="mt-4 space-y-4">{questions.map((question, index) => <fieldset key={question.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><legend className="px-1 text-sm font-semibold">Question {index + 1}</legend><label htmlFor={`prompt-${question.id}`} className="text-xs text-white/60">Prompt</label><input id={`prompt-${question.id}`} required value={question.prompt} onChange={(event) => changeQuestion(index, { prompt: event.target.value })} className={field} /><div className="mt-3 grid gap-3 sm:grid-cols-2">{question.options.map((option, optionIndex) => <div key={optionIndex}><label htmlFor={`option-${question.id}-${optionIndex}`} className="text-xs text-white/60">Answer {optionIndex + 1}</label><input id={`option-${question.id}-${optionIndex}`} required value={option} onChange={(event) => { const options = [...question.options] as CourseworkQuestion["options"]; options[optionIndex] = event.target.value; changeQuestion(index, { options }) }} className={field} /></div>)}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label htmlFor={`correct-${question.id}`} className="text-xs text-white/60">Correct answer</label><select id={`correct-${question.id}`} value={question.correctIndex} onChange={(event) => changeQuestion(index, { correctIndex: Number(event.target.value) })} className={field}>{question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Answer {optionIndex + 1}</option>)}</select></div><div><label htmlFor={`explanation-${question.id}`} className="text-xs text-white/60">Explanation</label><input id={`explanation-${question.id}`} required value={question.explanation} onChange={(event) => changeQuestion(index, { explanation: event.target.value })} className={field} /></div></div>{questions.length > 1 && <button type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} className="mt-3 text-xs text-rose-300">Remove question</button>}</fieldset>)}</div></div>
      <div><label htmlFor="reflection-prompt" className="text-sm text-white/75">Written response prompt</label><textarea id="reflection-prompt" required rows={2} value={reflectionPrompt} onChange={(event) => setReflectionPrompt(event.target.value)} placeholder="Explain why these gates produce that result." className={field} /><p className="mt-1 text-xs text-white/45">Written responses wait for instructor feedback; the demo does not grade them automatically.</p></div>
      <div className="grid gap-5 sm:grid-cols-3"><div><label htmlFor="assignment-audience" className="text-sm text-white/75">Assign to</label><select id="assignment-audience" value={audience} onChange={(event) => setAudience(event.target.value as "all" | "email")} className={field}><option value="all">All demo learners</option><option value="email">One learner email</option></select></div>{audience === "email" && <div><label htmlFor="target-email" className="text-sm text-white/75">Learner email</label><input id="target-email" type="email" required value={targetEmail} onChange={(event) => setTargetEmail(event.target.value)} className={field} /></div>}<div><label htmlFor="assignment-due" className="text-sm text-white/75">Due date (optional)</label><input id="assignment-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={field} /></div></div>
      {previewOpen && <section className="space-y-5 rounded-2xl border border-[#00D4FF]/30 bg-[#00D4FF]/[.04] p-5" aria-label="Learner preview"><div><p className="text-xs uppercase tracking-[.16em] text-[#00D4FF]">Learner preview · unsaved changes</p><h3 className="mt-2 text-xl font-semibold">{title || "Assignment title"}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-white/65">{instructions || "Study instructions will appear here."}</p></div>{circuit && <CircuitStudy circuit={circuit} />}<div><p className="text-sm font-semibold">Circuit quiz</p><ol className="mt-3 space-y-3">{questions.map((question, index) => <li key={question.id} className="rounded-lg border border-white/10 p-3 text-sm"><p>{index + 1}. {question.prompt || "Question prompt"}</p><ul className="mt-2 grid gap-1 text-white/55 sm:grid-cols-2">{question.options.map((option, optionIndex) => <li key={optionIndex}>{optionIndex + 1}. {option || "Answer option"}</li>)}</ul></li>)}</ol></div><p className="text-sm text-white/70">Written response: {reflectionPrompt || "Prompt will appear here."}</p></section>}
      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-3 text-sm text-[#4ADE80]">{message}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" className="rounded-lg border border-[#00D4FF]/40 px-4 py-2.5 text-sm font-semibold text-[#00D4FF]">Save draft</button><button type="button" onClick={(event) => { if (event.currentTarget.closest("form")?.reportValidity()) save(true) }} className="rounded-lg bg-[#00D4FF] px-4 py-2.5 text-sm font-semibold text-[#0A0E17]">Publish assignment</button></div>
    </form>

    <section className="mt-10"><h2 className="text-xl font-semibold">Created assignments</h2>{!mounted ? <p className="mt-4 text-sm text-white/50">Loading demo assignments...</p> : assignments.length === 0 ? <p className="mt-4 rounded-xl border border-white/10 p-5 text-sm text-white/55">No assignments yet. Create a circuit study task above.</p> : <div className="mt-4 grid gap-3">{[...assignments].reverse().map((assignment) => <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.03] p-4"><div><p className="text-sm font-semibold">{assignment.title}</p><p className="mt-1 text-xs text-white/50">{assignment.status} · version {assignment.version} · {assignment.questions.length} questions · {assignment.audience === "all" ? "all demo learners" : assignment.targetEmail}</p></div><div className="flex flex-wrap gap-3 text-xs"><Link href={`/instructor/assignments/${assignment.id}`} className="text-[#00D4FF]">Review</Link>{assignment.status === "draft" ? <><button type="button" onClick={() => edit(assignment.id)} className="text-[#00D4FF]">Edit</button><button type="button" onClick={() => publish(assignment.id)} className="text-[#F5B942]">Publish</button></> : <button type="button" onClick={() => { const id = duplicateAsDraft(assignment.id); if (id) edit(id) }} className="text-[#F5B942]">New version</button>}</div></div>)}</div>}</section>
  </div></AppShell>
}
