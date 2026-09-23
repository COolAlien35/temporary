import type { StudioCircuit } from "./types"

/** Compactly encodes a circuit into a URL-safe base64 string for the Share button / URL hash. */
export function encodeCircuit(circuit: StudioCircuit): string {
  if (typeof window === "undefined") return ""
  const json = JSON.stringify({ n: circuit.name, q: circuit.qubits, g: circuit.gates })
  return btoa(encodeURIComponent(json))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export function decodeCircuit(encoded: string): StudioCircuit | null {
  if (typeof window === "undefined" || !encoded) return null
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
    const json = decodeURIComponent(atob(b64))
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.g) || typeof parsed.q !== "number") return null
    return { name: parsed.n ?? "Untitled circuit", qubits: parsed.q, gates: parsed.g }
  } catch {
    return null
  }
}
