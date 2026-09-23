import { nanoid } from "nanoid"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { runCircuit } from "@/lib/sim/run-circuit"
import type { SavedCircuit, SimResult, StudioCircuit, StudioGate } from "@/lib/studio/types"

const MAX_QUBITS = 5
const MIN_QUBITS = 1

function emptyCircuit(): StudioCircuit {
  return { name: "Untitled circuit", qubits: 2, gates: [] }
}

interface Snapshot {
  name: string
  qubits: number
  gates: StudioGate[]
}

function snapshot(circuit: StudioCircuit): Snapshot {
  return { name: circuit.name, qubits: circuit.qubits, gates: circuit.gates.map((g) => ({ ...g })) }
}

interface StudioState {
  circuit: StudioCircuit
  past: Snapshot[]
  future: Snapshot[]
  selectedGateIds: string[]
  clipboard: StudioGate[]
  shots: number
  noise: { depolarizing: number; readoutError: number }
  viewMode: "visual" | "code" | "split"
  codeLanguage: "qiskit" | "qasm"
  result?: SimResult
  previousResult?: SimResult
  lastRunAt?: number
  stepIndex: number | null
  justLoadedAt: number
  savedCircuits: SavedCircuit[]

  setName: (name: string) => void
  setQubits: (n: number) => void
  addGate: (gate: Omit<StudioGate, "id">) => void
  updateGate: (id: string, patch: Partial<StudioGate>) => void
  removeGate: (id: string) => void
  removeSelected: () => void
  moveGate: (id: string, step: number, qubit: number) => void
  clear: () => void
  loadCircuit: (circuit: StudioCircuit) => void
  undo: () => void
  redo: () => void
  select: (ids: string[]) => void
  toggleSelect: (id: string, additive?: boolean) => void
  copySelected: () => void
  paste: () => void
  setShots: (n: number) => void
  setNoise: (patch: Partial<{ depolarizing: number; readoutError: number }>) => void
  setViewMode: (mode: "visual" | "code" | "split") => void
  setCodeLanguage: (lang: "qiskit" | "qasm") => void
  run: () => void
  setStepIndex: (i: number | null) => void
  saveCurrentAs: (name: string) => void
  loadSaved: (id: string) => void
  deleteSaved: (id: string) => void
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      circuit: emptyCircuit(),
      past: [],
      future: [],
      selectedGateIds: [],
      clipboard: [],
      shots: 1024,
      noise: { depolarizing: 0, readoutError: 0 },
      viewMode: "visual",
      codeLanguage: "qiskit",
      result: undefined,
      previousResult: undefined,
      lastRunAt: undefined,
      stepIndex: null,
      justLoadedAt: 0,
      savedCircuits: [],

      setName: (name) => set((s) => ({ circuit: { ...s.circuit, name } })),

      setQubits: (n) =>
        set((s) => {
          const qubits = Math.max(MIN_QUBITS, Math.min(MAX_QUBITS, n))
          const gates = s.circuit.gates.filter((g) => g.qubit < qubits && (g.target ?? 0) < qubits && (g.control2 ?? 0) < qubits)
          return { past: [...s.past, snapshot(s.circuit)].slice(-50), future: [], circuit: { ...s.circuit, qubits, gates } }
        }),

      addGate: (gate) =>
        set((s) => ({
          past: [...s.past, snapshot(s.circuit)].slice(-50),
          future: [],
          circuit: { ...s.circuit, gates: [...s.circuit.gates, { ...gate, id: nanoid(8) }] },
        })),

      updateGate: (id, patch) =>
        set((s) => ({
          past: [...s.past, snapshot(s.circuit)].slice(-50),
          future: [],
          circuit: { ...s.circuit, gates: s.circuit.gates.map((g) => (g.id === id ? { ...g, ...patch } : g)) },
        })),

      removeGate: (id) =>
        set((s) => ({
          past: [...s.past, snapshot(s.circuit)].slice(-50),
          future: [],
          circuit: { ...s.circuit, gates: s.circuit.gates.filter((g) => g.id !== id) },
          selectedGateIds: s.selectedGateIds.filter((sid) => sid !== id),
        })),

      removeSelected: () =>
        set((s) => ({
          past: [...s.past, snapshot(s.circuit)].slice(-50),
          future: [],
          circuit: { ...s.circuit, gates: s.circuit.gates.filter((g) => !s.selectedGateIds.includes(g.id)) },
          selectedGateIds: [],
        })),

      moveGate: (id, step, qubit) =>
        set((s) => ({
          past: [...s.past, snapshot(s.circuit)].slice(-50),
          future: [],
          circuit: { ...s.circuit, gates: s.circuit.gates.map((g) => (g.id === id ? { ...g, step, qubit } : g)) },
        })),

      clear: () =>
        set((s) => ({
          past: [...s.past, snapshot(s.circuit)].slice(-50),
          future: [],
          circuit: { ...s.circuit, gates: [] },
          selectedGateIds: [],
          result: undefined,
          previousResult: undefined,
        })),

      loadCircuit: (circuit) =>
        set((s) => ({
          past: [...s.past, snapshot(s.circuit)].slice(-50),
          future: [],
          circuit: { name: circuit.name, qubits: Math.max(MIN_QUBITS, Math.min(MAX_QUBITS, circuit.qubits)), gates: circuit.gates.map((g) => ({ ...g })) },
          selectedGateIds: [],
          result: undefined,
          previousResult: undefined,
          justLoadedAt: Date.now(),
        })),

      undo: () =>
        set((s) => {
          if (s.past.length === 0) return s
          const prev = s.past[s.past.length - 1]
          return { past: s.past.slice(0, -1), future: [snapshot(s.circuit), ...s.future].slice(0, 50), circuit: { name: prev.name, qubits: prev.qubits, gates: prev.gates } }
        }),

      redo: () =>
        set((s) => {
          if (s.future.length === 0) return s
          const next = s.future[0]
          return { future: s.future.slice(1), past: [...s.past, snapshot(s.circuit)].slice(-50), circuit: { name: next.name, qubits: next.qubits, gates: next.gates } }
        }),

      select: (ids) => set({ selectedGateIds: ids }),
      toggleSelect: (id, additive) =>
        set((s) => {
          if (!additive) return { selectedGateIds: s.selectedGateIds.includes(id) && s.selectedGateIds.length === 1 ? [] : [id] }
          return { selectedGateIds: s.selectedGateIds.includes(id) ? s.selectedGateIds.filter((sid) => sid !== id) : [...s.selectedGateIds, id] }
        }),

      copySelected: () =>
        set((s) => ({ clipboard: s.circuit.gates.filter((g) => s.selectedGateIds.includes(g.id)).map((g) => ({ ...g })) })),

      paste: () =>
        set((s) => {
          if (s.clipboard.length === 0) return s
          const maxStep = Math.max(0, ...s.circuit.gates.map((g) => g.step))
          const offset = maxStep + 1 - Math.min(...s.clipboard.map((g) => g.step))
          const pasted = s.clipboard.map((g) => ({ ...g, id: nanoid(8), step: g.step + offset }))
          return { past: [...s.past, snapshot(s.circuit)].slice(-50), future: [], circuit: { ...s.circuit, gates: [...s.circuit.gates, ...pasted] }, selectedGateIds: pasted.map((g) => g.id) }
        }),

      setShots: (n) => set({ shots: n }),
      setNoise: (patch) => set((s) => ({ noise: { ...s.noise, ...patch } })),
      setViewMode: (mode) => set({ viewMode: mode }),
      setCodeLanguage: (lang) => set({ codeLanguage: lang }),

      run: () => {
        const s = get()
        const result = runCircuit(s.circuit.qubits, s.circuit.gates, { shots: s.shots, depolarizing: s.noise.depolarizing, readoutError: s.noise.readoutError })
        set({ previousResult: s.result, result, lastRunAt: Date.now(), stepIndex: null })
      },

      setStepIndex: (i) => set({ stepIndex: i }),

      saveCurrentAs: (name) =>
        set((s) => {
          const existing = s.savedCircuits.find((c) => c.name === name)
          const entry: SavedCircuit = { id: existing?.id ?? nanoid(8), name, qubits: s.circuit.qubits, gates: s.circuit.gates.map((g) => ({ ...g })), updatedAt: Date.now() }
          return { savedCircuits: [entry, ...s.savedCircuits.filter((c) => c.id !== entry.id)], circuit: { ...s.circuit, name } }
        }),

      loadSaved: (id) => {
        const found = get().savedCircuits.find((c) => c.id === id)
        if (found) get().loadCircuit(found)
      },

      deleteSaved: (id) => set((s) => ({ savedCircuits: s.savedCircuits.filter((c) => c.id !== id) })),
    }),
    {
      name: "studio:circuit-v1",
      partialize: (s) => ({ circuit: s.circuit, shots: s.shots, noise: s.noise, savedCircuits: s.savedCircuits, viewMode: s.viewMode, codeLanguage: s.codeLanguage }),
    },
  ),
)

export { MAX_QUBITS, MIN_QUBITS }
