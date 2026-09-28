import { getTemplate } from "@/lib/studio/templates"
import type { SavedCircuit, StudioCircuit } from "@/lib/studio/types"

export function circuitForTemplate(key: string): StudioCircuit | null {
  const template = getTemplate(key)
  if (!template) return null
  return {
    name: template.name,
    qubits: template.qubits,
    gates: template.gates.map((gate, index) => ({ ...gate, id: `${template.key}-gate-${index}` })),
  }
}

export function circuitForSource(source: string, savedCircuits: SavedCircuit[], current: StudioCircuit): StudioCircuit | null {
  if (source.startsWith("template:")) return circuitForTemplate(source.slice("template:".length))
  if (source === "current") return current.gates.length ? structuredClone(current) : null
  if (source.startsWith("saved:")) {
    const saved = savedCircuits.find((circuit) => circuit.id === source.slice("saved:".length))
    return saved ? { name: saved.name, qubits: saved.qubits, gates: structuredClone(saved.gates) } : null
  }
  return null
}
