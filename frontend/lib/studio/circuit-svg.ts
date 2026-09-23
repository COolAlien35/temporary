import { GATE_DEFS } from "./gates"
import type { StudioCircuit } from "./types"

const CELL_W = 68
const CELL_H = 56
const LEFT_PAD = 56

/** Renders a static, standalone SVG markup string of the circuit for the PNG export action. */
export function circuitToSvgString(circuit: StudioCircuit): string {
  const maxStep = Math.max(0, ...circuit.gates.map((g) => g.step))
  const width = LEFT_PAD + (maxStep + 2) * CELL_W
  const height = circuit.qubits * CELL_H + 24

  const wires = Array.from({ length: circuit.qubits }, (_, q) => {
    const y = 16 + q * CELL_H + CELL_H / 2
    return `<line x1="${LEFT_PAD}" y1="${y}" x2="${width - 16}" y2="${y}" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5" /><text x="4" y="${y + 4}" fill="#ffffff" fill-opacity="0.6" font-size="12" font-family="monospace">q[${q}]</text>`
  }).join("")

  const gates = circuit.gates
    .map((gate) => {
      const def = GATE_DEFS[gate.type]
      const x = LEFT_PAD + gate.step * CELL_W + CELL_W / 2
      const yQ = 16 + gate.qubit * CELL_H + CELL_H / 2
      if (def.slots >= 2) {
        const targetQ = gate.target ?? (gate.qubit === 0 ? 1 : 0)
        const yT = 16 + targetQ * CELL_H + CELL_H / 2
        const c2 = gate.control2
        const yC2 = c2 !== undefined ? 16 + c2 * CELL_H + CELL_H / 2 : undefined
        const top = Math.min(yQ, yT, yC2 ?? yQ)
        const bottom = Math.max(yQ, yT, yC2 ?? yQ)
        return `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="#00D4FF" stroke-width="1.5" /><circle cx="${x}" cy="${yQ}" r="5" fill="#00D4FF" />${yC2 !== undefined ? `<circle cx="${x}" cy="${yC2}" r="5" fill="#00D4FF" />` : ""}<rect x="${x - 15}" y="${yT - 15}" width="30" height="30" rx="7" fill="#00D4FF22" stroke="#00D4FF" /><text x="${x}" y="${yT + 5}" text-anchor="middle" fill="#00D4FF" font-size="13" font-family="sans-serif">${def.symbol}</text>`
      }
      if (gate.type === "BARRIER") return `<line x1="${x}" y1="${yQ - 24}" x2="${x}" y2="${yQ + 24}" stroke="#ffffff" stroke-opacity="0.4" stroke-dasharray="3 3" stroke-width="2" />`
      return `<rect x="${x - 17}" y="${yQ - 17}" width="34" height="34" rx="8" fill="#00D4FF22" stroke="#00D4FF" /><text x="${x}" y="${yQ + 5}" text-anchor="middle" fill="#00D4FF" font-size="13" font-family="sans-serif">${def.symbol}</text>`
    })
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#0A0E17" />${wires}${gates}</svg>`
}
