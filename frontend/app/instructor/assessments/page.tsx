"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { CircuitStudy } from "@/components/coursework/CircuitStudy"
import { circuitForSource } from "@/lib/coursework/circuits"
import type { CourseworkQuestion } from "@/lib/coursework/types"
import type { AssessmentTemplateKind } from "@/lib/assessments/templates"
import { units } from "@/lib/curriculum/units"
import { platformServices } from "@/lib/services"
import { TEMPLATES } from "@/lib/studio/templates"
import { useAssessmentTemplates } from "@/store/use-assessment-templates"
import { useStudio } from "@/store/use-studio"

const field = "mt-2 w-full rounded-xl border border-white/15 bg-[#10141F] px-4 py-3 text-sm text-white outline-none focus:border-[#00D4FF]"
const makeQuestion = (): CourseworkQuestion => ({ id: crypto.randomUUID(), prompt: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" })
const kinds: { id: AssessmentTemplateKind; label: string; description: string }[] = [
  { id: "quiz", label: "Quiz", description: "Questions about a circuit or lesson, with answer feedback." },
  { id: "code", label: "Code", description: "A code response for manual instructor review; no code is executed." },
  { id: "debug", label: "Debug", description: "Study a faulty circuit and explain the repair." },
]

export default function InstructorAssessmentsPage() {
  const templates = useAssessmentTemplates((state) => state.templates)
  const savedCircuits = useStudio((state) => state.savedCircuits)
  const currentCircuit = useStudio((state) => state.circuit)
  const [mounted, setMounted] = useState(false)
  const [kind, setKind] = useState<AssessmentTemplateKind>("quiz")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [unitId, setUnitId] = useState("u1")
  const [instructions, setInstructions] = useState("")
  const [circuitSource, setCircuitSource] = useState("template:bell")
  const [questions, setQuestions] = useState<CourseworkQuestion[]>([{ id: "initial", prompt: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }])
  const [reflectionPrompt, setReflectionPrompt] = useState("")
  const [starterCode, setStarterCode] = useState("")
  const [preview, setPreview] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const circuit = circuitForSource(circuitSource, savedCircuits, currentCircuit) ?? templates.find((item) => item.id === editingId)?.circuit ?? null

  useEffect(() => setMounted(true), [])

  function reset(nextKind = kind) {
    setKind(nextKind); setEditingId(null); setTitle(""); setUnitId("u1"); setInstructions("")
    setCircuitSource("template:bell"); setQuestions([makeQuestion()]); setReflectionPrompt(""); setStarterCode("")
    setPreview(false); setError(""); setMessage("")
  }

  function edit(id: string) {
    const item = templates.find((template) => template.id === id)
    if (!item) return
    setKind(item.kind); setEditingId(item.id); setTitle(item.title); setUnitId(item.unitId)
    setInstructions(item.instructions); setCircuitSource(item.circuitSource); setQuestions(structuredClone(item.questions))
    setReflectionPrompt(item.reflectionPrompt); setStarterCode(item.starterCode ?? "")
    setError(""); setMessage(`Editing template version ${item.version}. Published assignments keep their saved copy.`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function changeQuestion(index: number, changes: Partial<CourseworkQuestion>) {
    setQuestions((current) => current.map((item, position) => position === index ? { ...item, ...changes } : item))
  }

  async function save() {
    setError(""); setMessage("")
    if (!circuit) return setError("Choose a circuit with gates before saving.")
    if (title.trim().length < 5 || instructions.trim().length < 10) return setError("Add a title and clear study instructions.")
    if (!questions.length || questions.some((question) => !question.prompt.trim() || question.options.some((option) => !option.trim()) || !question.explanation.trim())) return setError("Complete every question, all four answers, and its explanation.")
    if (!reflectionPrompt.trim()) return setError("Add a written response prompt.")
    setPending(true)
    try {
      const saved = await platformServices.assessments.saveTemplate({ kind, title: title.trim(), unitId, instructions: instructions.trim(), circuit: structuredClone(circuit), circuitSource, questions: structuredClone(questions), reflectionPrompt: reflectionPrompt.trim(), starterCode: kind === "code" ? starterCode : undefined }, editingId ?? undefined)
      setEditingId(saved.id)
      setMessage("Reusable assessment saved in this browser. Add it to an assignment to deliver it to learners.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this assessment. Please retry.")
    } finally { setPending(false) }
  }

  return <AppShell variant="instructor"><div className="mx-auto max-w-6xl px-5 py-10 text-white md:px-8">
    <Link href="/instructor" className="text-sm text-[#00D4FF]">← Instructor overview</Link>
    <p className="mt-7 text-xs uppercase tracking-[.22em] text-[#F5B942]">Reusable teaching material · browser-local demo</p><h1 className="mt-2 text-4xl font-semibold">Assessments</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Create a reusable quiz, code prompt, or circuit debugging exercise. Add it to an assignment to choose learners, publish a fixed copy, collect responses, and give feedback.</p>
    <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Assessment type">{kinds.map((item) => <button key={item.id} type="button" role="tab" aria-selected={kind === item.id} onClick={() => { if (kind !== item.id) reset(item.id) }} className={`rounded-xl px-5 py-3 text-sm ${kind === item.id ? "bg-[#00D4FF] font-semibold text-[#0A0E17]" : "border border-white/15 text-white/70"}`}>{item.label}</button>)}</div>
    <p className="mt-3 text-sm text-white/50">{kinds.find((item) => item.id === kind)?.description}</p>
    <section id="assessment-editor" role="tabpanel" className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-7" aria-label="Assessment editor"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{editingId ? "Edit reusable assessment" : `New ${kind} assessment`}</h2>{editingId && <button type="button" onClick={() => reset()} className="text-sm text-[#00D4FF]">New assessment</button>}</div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm text-white/70">Title<input value={title} onChange={(event) => setTitle(event.target.value)} className={field} /></label><label className="text-sm text-white/70">Related curriculum unit<select value={unitId} onChange={(event) => setUnitId(event.target.value)} className={field}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}</option>)}</select></label></div>
      <label className="mt-5 block text-sm text-white/70">Study instructions<textarea rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} className={field} /></label>
      <label className="mt-5 block text-sm text-white/70">Circuit for learners to study<select value={circuitSource} onChange={(event) => setCircuitSource(event.target.value)} className={field}><optgroup label="Built-in templates">{TEMPLATES.map((item) => <option key={item.key} value={`template:${item.key}`}>{item.name}</option>)}</optgroup><optgroup label="Circuit Studio"><option value="current" disabled={!currentCircuit.gates.length}>Current circuit{currentCircuit.gates.length ? "" : " (empty)"}</option>{savedCircuits.map((item) => <option key={item.id} value={`saved:${item.id}`}>Saved: {item.name}</option>)}</optgroup></select></label>
      {kind === "code" && <label className="mt-5 block text-sm text-white/70">Starter code (optional)<textarea rows={5} value={starterCode} onChange={(event) => setStarterCode(event.target.value)} spellCheck={false} className={`${field} font-mono`} /><span className="mt-1 block text-xs text-white/45">Learners submit code text for manual review. This demo does not run it.</span></label>}
      <div className="mt-6 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Quiz questions</h3><button type="button" onClick={() => setQuestions((current) => [...current, makeQuestion()])} className="rounded-lg border border-[#00D4FF]/40 px-3 py-2 text-xs text-[#00D4FF]">Add question</button></div>
      <div className="mt-4 space-y-4">{questions.map((question, index) => <fieldset key={question.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><legend className="px-1 text-sm font-semibold">Question {index + 1}</legend><label className="text-xs text-white/60">Prompt<input value={question.prompt} onChange={(event) => changeQuestion(index, { prompt: event.target.value })} className={field} /></label><div className="mt-3 grid gap-3 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="text-xs text-white/60">Answer {optionIndex + 1}<input value={option} onChange={(event) => { const options = [...question.options] as CourseworkQuestion["options"]; options[optionIndex] = event.target.value; changeQuestion(index, { options }) }} className={field} /></label>)}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-white/60">Correct answer<select value={question.correctIndex} onChange={(event) => changeQuestion(index, { correctIndex: Number(event.target.value) })} className={field}>{question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Answer {optionIndex + 1}</option>)}</select></label><label className="text-xs text-white/60">Explanation<input value={question.explanation} onChange={(event) => changeQuestion(index, { explanation: event.target.value })} className={field} /></label></div>{questions.length > 1 && <button type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} className="mt-3 text-xs text-rose-300">Remove question</button>}</fieldset>)}</div>
      <label className="mt-5 block text-sm text-white/70">Written response prompt<textarea rows={2} value={reflectionPrompt} onChange={(event) => setReflectionPrompt(event.target.value)} className={field} /></label>
      <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => setPreview((open) => !open)} className="rounded-xl border border-white/15 px-4 py-3 text-sm text-white/70">{preview ? "Hide learner preview" : "Preview learner view"}</button><button type="button" disabled={pending} onClick={save} className="rounded-xl bg-[#00D4FF] px-5 py-3 text-sm font-semibold text-[#0A0E17] disabled:opacity-50">{pending ? "Saving…" : "Save reusable assessment"}</button>{editingId && <Link href={`/instructor/assignments?template=${encodeURIComponent(editingId)}`} className="rounded-xl border border-[#00D4FF]/40 px-4 py-3 text-sm text-[#00D4FF]">Use in assignment →</Link>}</div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}{message && <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}
      {preview && <div className="mt-6 space-y-4 rounded-xl border border-[#00D4FF]/25 bg-[#00D4FF]/5 p-5" aria-label="Learner preview"><p className="text-xs uppercase tracking-wider text-[#00D4FF]">Learner preview · unsaved changes</p><h3 className="text-lg font-semibold">{title || "Assessment title"}</h3><p className="whitespace-pre-wrap text-sm text-white/65">{instructions || "Study instructions will appear here."}</p>{circuit && <CircuitStudy circuit={circuit} />}{kind === "code" && <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-white/70">{starterCode || "Code response field"}</pre>}<ul className="space-y-2">{questions.map((question, index) => <li key={question.id} className="rounded-lg bg-black/20 p-3 text-sm">{index + 1}. {question.prompt || "Question prompt"}</li>)}</ul><p className="text-sm text-white/60">Written response: {reflectionPrompt || "Prompt will appear here."}</p></div>}
    </section>
    <section className="mt-9"><h2 className="text-xl font-semibold">Saved assessments</h2>{!mounted ? <p className="mt-4 text-sm text-white/45">Loading local templates…</p> : templates.length === 0 ? <p className="mt-4 rounded-xl border border-white/10 p-5 text-sm text-white/50">No reusable assessments yet.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{[...templates].reverse().map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-white/[.03] p-5"><p className="text-xs uppercase tracking-wider text-[#F5B942]">{item.kind} · version {item.version}</p><h3 className="mt-2 font-semibold">{item.title}</h3><p className="mt-2 text-xs text-white/45">{units.find((unit) => unit.id === item.unitId)?.title} · {item.questions.length} question{item.questions.length === 1 ? "" : "s"}</p><div className="mt-4 flex gap-4 text-sm"><button type="button" onClick={() => edit(item.id)} className="text-[#00D4FF]">Edit</button><Link href={`/instructor/assignments?template=${encodeURIComponent(item.id)}`} className="text-[#00D4FF]">Use in assignment →</Link></div></article>)}</div>}</section>
  </div></AppShell>
}
