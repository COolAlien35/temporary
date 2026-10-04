import { connectedAccessToken } from "./connected-auth"
import type { CircuitRecord } from "./learning-loop-api"
import type { StudioCircuit, StudioGate } from "@/lib/studio/types"
import type { Design, PlacedComponent, Route, Stage } from "@/lib/hardware/types"

export type PartyEvent = { event_id: string; party_id: string; actor_id: string; revision: number; kind: string; payload: { text?: string }; created_at: string }
export type PartyKind = "circuit" | "hardware"
export type PartyDocument = StudioCircuit | Design
export type Party<T = StudioCircuit> = { id: string; kind: PartyKind; circuit_id: string; revision: number; snapshot: T; capacity: number; role: "owner" | "edit" | "comment" | "view"; members: { id: string; name: string; role: string }[]; chat: PartyEvent[] }
type EntityChanges<T> = { upsert: T[]; delete: string[] }
export type HardwareChanges = { stages: EntityChanges<Stage>; placed: EntityChanges<PlacedComponent>; routes: EntityChanges<Route>; meta?: Design["meta"] }
export type PartyAction = { event_id: string; circuit_id: string; base_revision: number; kind: "upsert" | "delete" | "settings" | "chat" | "hardware"; changes?: HardwareChanges; gate?: StudioGate; gate_id?: string; name?: string; qubits?: number; text?: string }
export class PartyApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export const partyOrigin = () => process.env.NEXT_PUBLIC_QUANTUMLOOP_API_URL!.replace(/\/$/, "")

export async function partyRequest<T>(path: string, method = "GET", body?: unknown, key?: string): Promise<T> {
  const token = await connectedAccessToken()
  if (!token) throw new Error("Sign in with a connected account to join a party.")
  const response = await fetch(`${partyOrigin()}/api/v1${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, body: body ? JSON.stringify(body) : undefined, credentials: "omit" })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new PartyApiError(response.status, data?.error?.message ?? "Party request failed.")
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export const partiesApi = {
  create: (circuit: StudioCircuit, capacity: number, key: string) => partyRequest<Party>("/parties", "POST", { circuit, capacity }, key),
  createHardware: (design: Design, capacity: number, key: string) => partyRequest<Party<Design>>("/parties", "POST", { kind: "hardware", design, capacity }, key),
  freeze: (id: string, revision: number, key: string) => partyRequest<{ party_id: string; party_revision: number; circuit: CircuitRecord }>(`/parties/${id}/circuit-copy`, "POST", { revision }, key),
  read: <T = StudioCircuit>(id: string, after = 0) => partyRequest<Party<T>>(`/parties/${id}?after=${after}`),
  invite: (id: string, role: string, email: string | null, hours: number) => partyRequest<{ id: string; token: string; expires_at: string }>(`/parties/${id}/invitations`, "POST", { role, email, hours }),
  accept: <T = StudioCircuit>(token: string) => partyRequest<Party<T>>("/party-invitations/accept", "POST", { token }),
  act: (id: string, action: PartyAction) => partyRequest<PartyEvent>(`/parties/${id}/actions`, "POST", action),
  remove: (id: string, profile: string) => partyRequest<void>(`/parties/${id}/members/${profile}`, "DELETE"),
  close: (id: string) => partyRequest<void>(`/parties/${id}`, "DELETE"),
  revoke: (id: string, invite: string) => partyRequest<void>(`/parties/${id}/invitations/${invite}`, "DELETE"),
}

export function hardwareOperations(before: Design, after: Design): Omit<PartyAction, "event_id" | "circuit_id" | "base_revision">[] {
  const diff = <T extends { id: string }>(old: T[], next: T[]): EntityChanges<T> => {
    const previous = new Map(old.map((entity) => [entity.id, entity]))
    const remaining = new Set(next.map((entity) => entity.id))
    return { delete: old.filter((entity) => !remaining.has(entity.id)).map((entity) => entity.id), upsert: next.filter((entity) => JSON.stringify(previous.get(entity.id)) !== JSON.stringify(entity)) }
  }
  const changes: HardwareChanges = { stages: diff(before.stages, after.stages), placed: diff(before.placed, after.placed), routes: diff(before.routes, after.routes) }
  if (JSON.stringify({ ...before.meta, updatedAt: 0 }) !== JSON.stringify({ ...after.meta, updatedAt: 0 })) changes.meta = after.meta
  return changes.meta || [changes.stages, changes.placed, changes.routes].some((change) => change.upsert.length || change.delete.length) ? [{ kind: "hardware", changes }] : []
}

export function circuitOperations(before: StudioCircuit, after: StudioCircuit): Omit<PartyAction, "event_id" | "circuit_id" | "base_revision">[] {
  const operations: Omit<PartyAction, "event_id" | "circuit_id" | "base_revision">[] = []
  const next = new Map(after.gates.map((gate) => [gate.id, gate]))
  for (const gate of before.gates) if (!next.has(gate.id)) operations.push({ kind: "delete", gate_id: gate.id })
  if (before.name !== after.name || before.qubits !== after.qubits) operations.push({ kind: "settings", name: after.name, qubits: after.qubits })
  const previous = new Map(before.gates.map((gate) => [gate.id, gate]))
  for (const gate of after.gates) if (JSON.stringify(previous.get(gate.id)) !== JSON.stringify(gate)) operations.push({ kind: "upsert", gate })
  return operations
}
