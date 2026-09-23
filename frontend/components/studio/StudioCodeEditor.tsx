"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { TriangleAlert } from "lucide-react"
import { QUANTUMLOOP_THEME } from "@/lib/monaco-theme"
import { exportQiskit } from "@/lib/studio/export-qiskit"
import { exportQasm } from "@/lib/studio/export-qasm"
import { importQiskit } from "@/lib/studio/import-qiskit"
import { importQasm } from "@/lib/studio/import-qasm"
import { useStudio } from "@/store/use-studio"
import { cn } from "@/lib/utils"

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="h-full min-h-[240px] animate-pulse bg-secondary/30" /> })

export function StudioCodeEditor() {
  const circuit = useStudio((s) => s.circuit)
  const codeLanguage = useStudio((s) => s.codeLanguage)
  const setCodeLanguage = useStudio((s) => s.setCodeLanguage)
  const loadCircuit = useStudio((s) => s.loadCircuit)

  const generated = useMemo(() => (codeLanguage === "qiskit" ? exportQiskit(circuit) : exportQasm(circuit)), [circuit, codeLanguage])
  const [code, setCode] = useState(generated)
  const [synced, setSynced] = useState(true)
  const [unsupported, setUnsupported] = useState<number[]>([])

  useEffect(() => {
    setCode(generated)
    setSynced(true)
    setUnsupported([])
  }, [generated])

  function apply() {
    const parsed = codeLanguage === "qiskit" ? importQiskit(code, circuit.qubits) : importQasm(code, circuit.qubits)
    setUnsupported(parsed.unsupportedLines)
    if (parsed.unsupportedLines.length === 0) {
      loadCircuit({ name: circuit.name, qubits: circuit.qubits, gates: parsed.gates })
      setSynced(true)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
        <div className="flex rounded-md bg-white/5 p-0.5">
          {(["qiskit", "qasm"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setCodeLanguage(lang)}
              className={cn("rounded px-2 py-1 text-[11px] font-medium", codeLanguage === lang ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "text-white/50")}
            >
              {lang === "qiskit" ? "Qiskit (Python)" : "OpenQASM 2.0"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-[11px]", synced ? "text-emerald-400" : "text-amber-400")}>{synced ? "\u25cf synced" : "\u25cf unapplied changes"}</span>
          <button type="button" onClick={apply} className="rounded-md bg-[#00D4FF] px-2.5 py-1 text-[11px] font-semibold text-[#0A0E17]">
            Apply to circuit
          </button>
        </div>
      </div>
      <div className="min-h-[240px] flex-1 overflow-hidden">
        <Monaco
          height="100%"
          language={codeLanguage === "qiskit" ? "python" : "cpp"}
          value={code}
          onChange={(value) => {
            setCode(value ?? "")
            setSynced(false)
          }}
          onMount={(editor, monaco) => {
            monaco.editor.defineTheme("quantumloop-dark", QUANTUMLOOP_THEME as any)
            monaco.editor.setTheme("quantumloop-dark")
            editor.addAction({ id: "apply", label: "Apply to circuit", keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter], run: apply })
          }}
          options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, padding: { top: 12 }, smoothScrolling: true, bracketPairColorization: { enabled: true } }}
        />
      </div>
      {unsupported.length > 0 && (
        <div className="flex items-center gap-1.5 border-t border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-[11px] text-amber-300">
          <TriangleAlert className="h-3 w-3" />
          Lines {unsupported.join(", ")} couldn&apos;t be mapped to the visual builder.
        </div>
      )}
    </div>
  )
}
