"use client"

import { useState } from "react"
import { ChevronDown, RotateCcw, Sparkles } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { platformServices } from "@/lib/services"
import type { TutorAction } from "@/lib/ai/tutor"
import { cn } from "@/lib/utils"

type ChatMessage = { id: string; from: "tutor" | "learner"; text: string }
const ACTIONS: { action: TutorAction; label: string; prompt: string }[] = [
  { action: "explain", label: "Explain", prompt: "Explain my circuit" },
  { action: "changed", label: "What changed?", prompt: "What changed?" },
  { action: "unexpected", label: "Unexpected result", prompt: "Why is this result unexpected?" },
  { action: "optimize", label: "Optimize", prompt: "How can I optimize this circuit?" },
  { action: "generate", label: "Preview circuit", prompt: "Suggest a circuit template" },
]

export function LabPartnerChat({ introMessage, hints }: { introMessage: string; hints: string[] }) {
  const { algorithm, gates, replaceGates, simulationResult, previousSimulationResult, hypothesis, sessionLog, incrementHints } = useLab()
  const [hintsOpen, setHintsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "m0", from: "tutor", text: introMessage }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [lastRequest, setLastRequest] = useState<{ prompt: string; action: TutorAction } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [undoGates, setUndoGates] = useState<typeof gates | null>(null)

  const ask = async (prompt: string, action: TutorAction = "explain") => {
    if (!prompt.trim() || loading) return
    const clean = prompt.trim()
    const request = { prompt: clean, action }
    setLastRequest(request)
    setError("")
    setShowPreview(false)
    setMessages((prev) => [...prev, { id: `learner-${Date.now()}`, from: "learner", text: clean }])
    setInput("")
    setLoading(true)
    try {
      const response = await platformServices.tutor.respond({
        action,
        prompt: clean,
        context: {
          circuit: {
            name: algorithm.name,
            qubits: algorithm.qubits,
            gates: gates.map((gate) => ({ id: gate.id, type: gate.gate, step: gate.step, qubit: gate.qubit, target: gate.target })),
          },
          result: simulationResult ?? undefined,
          previousResult: previousSimulationResult ?? undefined,
          lesson: algorithm.learn.body.join(" "),
          prediction: hypothesis,
          recentActions: sessionLog.slice(-4).map((entry) => entry.text),
        },
      })
      setMessages((prev) => [...prev, { id: response.id + Date.now(), from: "tutor", text: `${response.text} (${response.source === "demo" ? "Demo tutor" : "Tutor service"})` }])
      setShowPreview(action === "generate")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The tutor could not respond. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const applyPreview = () => {
    setUndoGates(gates.map((gate) => ({ ...gate })))
    replaceGates(algorithm.correctGates.map(({ step, qubit, gate, target }) => ({ step, qubit, gate, target })))
    setShowPreview(false)
    setMessages((prev) => [...prev, { id: `applied-${Date.now()}`, from: "tutor", text: "Reference circuit applied to the visual builder. Your previous circuit is available to undo." }])
  }

  const undoApply = () => {
    if (!undoGates) return
    replaceGates(undoGates.map(({ step, qubit, gate, target }) => ({ step, qubit, gate, target })))
    setUndoGates(null)
    setMessages((prev) => [...prev, { id: `undo-${Date.now()}`, from: "tutor", text: "Restored the circuit that was in the builder before the preview was applied." }])
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/60">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-3.5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Lab Partner</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">Uses lesson, prediction, circuit and run</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <div key={message.id} className={cn("max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed", message.from === "tutor" ? "bg-secondary text-foreground" : "ml-auto bg-primary/15 text-primary")}>
              {message.text}
            </div>
          ))}
          {loading && <p role="status" className="text-xs text-muted-foreground">Tutor is considering this run…</p>}
          {error && <div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">{error} <button type="button" disabled={loading || !lastRequest} onClick={() => lastRequest && ask(lastRequest.prompt, lastRequest.action)} className="ml-2 underline disabled:opacity-50">Retry</button></div>}
          {showPreview && (
            <div role="region" className="rounded-lg border border-primary/30 bg-primary/5 p-3" aria-label="Reference circuit preview">
              <p className="text-xs font-semibold">Reference circuit preview · {algorithm.name}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{algorithm.correctGates.map((gate) => `${gate.gate} q${gate.qubit}${gate.target === undefined ? "" : `→q${gate.target}`} (t${gate.step})`).join(" · ") || "No reference template is available for this track."}</p>
              <button type="button" disabled={!algorithm.correctGates.length} onClick={applyPreview} className="mt-3 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50">Apply preview to circuit</button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {ACTIONS.map(({ action, label, prompt }) => <button key={action} type="button" disabled={loading} onClick={() => ask(prompt, action)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-50">{label}</button>)}
          {undoGates && <button type="button" onClick={undoApply} className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"><RotateCcw className="size-3" />Undo apply</button>}
        </div>
        <button type="button" onClick={() => setHintsOpen((value) => !value)} aria-expanded={hintsOpen} className="mt-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
          Need a hint? Socratic Hint Ladder <ChevronDown className={cn("size-3.5 transition-transform", hintsOpen && "rotate-180")} />
        </button>
        {hintsOpen && <div className="mt-2 flex flex-wrap gap-1.5 px-2">{hints.map((hint) => <button key={hint} type="button" disabled={loading} onClick={() => { incrementHints(); void ask(hint) }} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-50">{hint}</button>)}</div>}
      </div>

      <form className="flex items-center gap-2 border-t border-border px-3 py-3" onSubmit={(event) => { event.preventDefault(); void ask(input) }}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about this lesson or run…" aria-label="Ask your lab partner" className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
        <button type="submit" disabled={!input.trim() || loading} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50">Ask</button>
      </form>
    </div>
  )
}
