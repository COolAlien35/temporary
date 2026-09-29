"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import { LearningLoopApiError, type SavedTutorMessage, type TutorRequestBody } from "@/lib/services/learning-loop-api"
import type { ConnectedLabResult } from "@/lib/services/connected-lab-run"

const ACTIONS: { action: TutorRequestBody["action"]; label: string; prompt: string }[] = [
  { action: "explain", label: "Explain", prompt: "Explain this saved run and its prediction comparison." },
  { action: "changed", label: "What changed?", prompt: "Which outcomes changed most from my prediction?" },
  { action: "unexpected", label: "Unexpected result", prompt: "Help me understand an unexpected outcome in this run." },
  { action: "optimize", label: "Optimize", prompt: "What circuit change should I test next, and why?" },
]

type PendingRequest = { body: TutorRequestBody; key: string }

export function ConnectedLabPartnerChat({ result }: { result: ConnectedLabResult }) {
  const { learningSessionId, run } = result
  const [messages, setMessages] = useState<SavedTutorMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const pending = useRef<PendingRequest | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    let active = true
    const api = connectedLearningLoopApi()
    void api.listTutorMessages(learningSessionId)
      .then((saved) => {
        if (active) setMessages(saved.filter((message) => message.run_id === run.id).reverse())
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load saved tutor messages.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; mounted.current = false }
  }, [learningSessionId, run.id, reload])

  async function ask(prompt: string, action: TutorRequestBody["action"] = "explain", retry = false) {
    const clean = prompt.trim()
    if (!clean || sending || loading) return
    const request = retry && pending.current
      ? pending.current
      : { body: { action, stage: "discuss" as const, prompt: clean, run_id: run.id }, key: crypto.randomUUID() }
    pending.current = request
    setSending(true)
    setError("")
    try {
      const saved = await connectedLearningLoopApi().sendTutorMessage(learningSessionId, request.body, request.key)
      if (!mounted.current) return
      setMessages((previous) => previous.some((message) => message.id === saved.id) ? previous : [...previous, saved])
      setInput("")
      pending.current = null
    } catch (cause) {
      if (!mounted.current) return
      if (cause instanceof LearningLoopApiError && ["tutor_failed", "tutor_unavailable"].includes(cause.code)) {
        pending.current = { ...request, key: crypto.randomUUID() }
      }
      setError(cause instanceof Error ? cause.message : "The tutor could not respond. Try again.")
    } finally {
      if (mounted.current) setSending(false)
    }
  }

  return <section aria-label="Saved run Lab Partner" className="flex h-full min-h-[420px] flex-col rounded-xl border border-border bg-card/60">
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <Sparkles className="size-3.5 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">Lab Partner</h3>
      <span className="ml-auto text-[10px] text-muted-foreground">Saved run context</span>
    </div>
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
      {loading && <p role="status" className="text-xs text-muted-foreground">Loading saved tutor messages…</p>}
      {!loading && messages.length === 0 && <p className="text-xs text-muted-foreground">Ask about this saved run. The tutor receives the owned circuit, run, and server comparison history.</p>}
      {messages.map((message) => <div key={message.id} className="space-y-2">
        <p className="ml-auto max-w-[90%] rounded-lg bg-primary/15 px-3 py-2 text-xs text-primary">{message.prompt}</p>
        <div className="max-w-[90%] rounded-lg bg-secondary px-3 py-2 text-xs text-foreground">
          <p>{message.response_text ?? (message.status === "failed" ? "This tutor request failed." : "Tutor response pending.")}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">{message.role.replaceAll("_", " ")} · {message.model} · {message.source_record_ids.length} saved sources</p>
        </div>
      </div>)}
      {sending && <p role="status" className="text-xs text-muted-foreground">Tutor is considering this saved run…</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">{error} {pending.current ? <button type="button" disabled={sending} onClick={() => { const request = pending.current; if (request) void ask(request.body.prompt, request.body.action, true) }} className="ml-2 underline">Retry</button> : <button type="button" onClick={() => { setLoading(true); setError(""); setReload((n) => n + 1) }} className="ml-2 underline">Retry loading</button>}</p>}
    </div>
    <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
      {ACTIONS.map(({ action, label, prompt }) => <button key={action} type="button" disabled={loading || sending} onClick={() => void ask(prompt, action)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-50">{label}</button>)}
    </div>
    <form className="flex items-center gap-2 border-t border-border px-3 py-3" onSubmit={(event) => { event.preventDefault(); void ask(input) }}>
      <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about this saved run…" aria-label="Ask Lab Partner about saved run" maxLength={1000} className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground" />
      <button type="submit" disabled={!input.trim() || loading || sending} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50">Ask</button>
    </form>
  </section>
}
