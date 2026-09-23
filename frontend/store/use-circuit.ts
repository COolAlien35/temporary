import { create } from "zustand"
import type { GatePlacement, GateType } from "@/lib/lab-data"

export type CircuitGate = { gate: GateType; qubit: number; target?: number; timeStep: number }

type CircuitStore = { gates: CircuitGate[]; setGates: (gates: CircuitGate[]) => void; clear: () => void }

export const useCircuit = create<CircuitStore>((set) => ({
  gates: [],
  setGates: (gates) => set({ gates }),
  clear: () => set({ gates: [] }),
}))

export function placementsToCircuit(gates: GatePlacement[]): CircuitGate[] {
  return gates.map(({ gate, qubit, target, step }) => ({ gate, qubit, target, timeStep: step }))
}
