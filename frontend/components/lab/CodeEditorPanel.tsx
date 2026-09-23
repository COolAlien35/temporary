"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import { Copy, Play, RotateCcw, TriangleAlert } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { circuitToQiskit } from "@/lib/circuit-to-qiskit"
import { qiskitToCircuit } from "@/lib/qiskit-to-circuit"
import { runQiskitMock, validateQiskitCode } from "@/lib/run-qiskit-mock"
import { QUANTUMLOOP_THEME } from "@/lib/monaco-theme"
import { CircuitMiniSVG } from "./CircuitMiniSVG"
import { cn } from "@/lib/utils"

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="h-full min-h-[320px] animate-pulse bg-secondary/30" /> })

export function CodeEditorPanel() {
  const { algorithm, gates, replaceGates, predictionLocked, mode, addLog, runSimulation, goToStage } = useLab()
  const initial = useMemo(() => circuitToQiskit(gates, algorithm.qubits), [algorithm.qubits, gates])
  const [code, setCode] = useState(initial)
  const [appliedCode, setAppliedCode] = useState(initial)
  const [outputOpen, setOutputOpen] = useState(false)
  const [outputTab, setOutputTab] = useState<"console" | "errors">("console")
  const [view, setView] = useState<"code" | "split" | "circuit">("code")
  const [warning, setWarning] = useState<number[]>([])
  const [result, setResult] = useState(() => runQiskitMock(initial))
  const editorRef = useRef<any>(null)
  const synced = code === appliedCode

  useEffect(() => { if (typeof window === "undefined") return; const saved = window.localStorage.getItem(`ql:code:${algorithm.slug}`); if (saved) { setCode(saved); setAppliedCode(saved) } }, [algorithm.slug])
  useEffect(() => { if (synced) setCode(circuitToQiskit(gates, algorithm.qubits)) }, [gates, algorithm.qubits, synced])
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(`ql:code:${algorithm.slug}`, code) }, [algorithm.slug, code])

  const apply = () => { const parsed = qiskitToCircuit(code, algorithm.qubits, 4); if (!parsed.unsupportedLines.length) replaceGates(parsed.gates); setWarning(parsed.unsupportedLines); setAppliedCode(code); addLog("Circuit edited via code"); setOutputOpen(parsed.unsupportedLines.length > 0); setOutputTab("errors") }
  const run = () => { apply(); setResult(runQiskitMock(code)); setOutputOpen(true); setOutputTab("console"); runSimulation() }
  const reset = () => { const next = circuitToQiskit(gates, algorithm.qubits); setCode(next); setAppliedCode(next); setWarning([]) }
  const markers = validateQiskitCode(code, algorithm.qubits)

  if (!predictionLocked) return <div className="mx-auto flex min-h-[320px] max-w-4xl items-center justify-center rounded-xl border border-border bg-card/60 p-8"><div className="text-center"><p className="text-sm font-medium">Lock your prediction in Predict before editing code</p><button type="button" onClick={() => goToStage(2)} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-black">Jump to Predict</button></div></div>

  return <div className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/60 px-3 py-2"><div className="flex items-center gap-2"><span className="rounded-md bg-secondary px-2 py-1 font-mono text-[11px]">Python · Qiskit</span><span className={cn("text-[11px]", synced ? "text-emerald-400" : "text-amber-400")}>{synced ? "● Synced with circuit" : "● Code has unapplied changes"}</span></div><div className="flex items-center gap-1"><div className="flex rounded-md bg-secondary/60 p-0.5">{(["code", "split", "circuit"] as const).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={cn("rounded px-2 py-1 text-[11px] capitalize", view === item ? "bg-background text-foreground" : "text-muted-foreground")}>{item}</button>)}</div><button type="button" onClick={apply} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-black">Apply to circuit</button><button type="button" onClick={run} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-black"><Play className="size-3" />Run</button><button type="button" onClick={reset} className="rounded-md border border-border p-1.5 text-muted-foreground" aria-label="Reset"><RotateCcw className="size-3.5" /></button><button type="button" onClick={() => navigator.clipboard?.writeText(code)} className="rounded-md border border-border p-1.5 text-muted-foreground" aria-label="Copy"><Copy className="size-3.5" /></button></div></div>
    <div className="flex min-h-0 flex-1 gap-3">{view !== "circuit" && <div className="min-h-[320px] min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-[#0D1220]"> <Monaco height="100%" language="python" value={code} onChange={(value) => setCode(value ?? "")} onMount={(editor, monaco) => { editorRef.current = editor; monaco.editor.defineTheme("quantumloop-dark", QUANTUMLOOP_THEME as any); monaco.editor.setTheme("quantumloop-dark"); editor.addAction({ id: "apply", label: "Apply to circuit", keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter], run: apply }); editor.addAction({ id: "run", label: "Run circuit", keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter], run }) }} options={{ readOnly: false, fontSize: 14, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, padding: { top: 16 }, smoothScrolling: true, bracketPairColorization: { enabled: true } }} /></div>}{view !== "code" && <div className="hidden min-h-[320px] flex-1 rounded-xl border border-border bg-card/40 p-4 md:block"><CircuitMiniSVG gates={gates} qubits={algorithm.qubits} /></div>}</div>
    <div className="overflow-hidden rounded-xl border border-border bg-card/60"><button type="button" onClick={() => setOutputOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-medium"><span>Output</span><span className="text-muted-foreground">{outputOpen ? "Collapse" : "Expand"}</span></button>{outputOpen && <div className="border-t border-border p-3 text-xs"><div className="mb-2 flex gap-3"><button type="button" onClick={() => setOutputTab("console")} className={cn(outputTab === "console" && "text-primary")}>Console</button><button type="button" onClick={() => setOutputTab("errors")} className={cn(outputTab === "errors" && "text-primary")}>Errors {warning.length > 0 && `(${warning.length})`}</button></div>{outputTab === "console" ? <pre className="font-mono text-muted-foreground">{result.error ? result.error.message : `${result.summary}\ncounts = ${JSON.stringify(result.counts)}`}</pre> : <div className="flex flex-col gap-1 text-amber-300">{warning.length ? warning.map((line) => <button key={line} type="button" className="flex items-center gap-2 text-left" onClick={() => editorRef.current?.revealLineInCenter(line)}><TriangleAlert className="size-3" />Line {line}: Some lines couldn&apos;t be shown in the visual builder</button>) : markers.map((marker) => <span key={`${marker.line}-${marker.message}`}>Line {marker.line}: {marker.message}</span>)}</div>}</div>}</div>
  </div>
}
