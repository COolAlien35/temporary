import { useStudio } from "@/store/use-studio"
import { useHardware } from "@/store/use-hardware"
import type { Design } from "@/lib/hardware/types"
import type { StudioCircuit } from "@/lib/studio/types"
import { circuitOperations, hardwareOperations, type PartyKind, type PartyDocument } from "./parties-api"

export const partyPath = (kind: PartyKind) => kind === "hardware" ? "/hardware/studio" : "/studio"

export function partyEditor(kind: PartyKind) {
  const apply = (document: PartyDocument, active: boolean) => {
    if (kind === "hardware") {
      const state = useHardware.getState()
      useHardware.setState({ partyActive: active, partyDraft: active ? state.partyDraft ?? state.design : null, design: document as Design, selectedPlacedId: null, selectedRouteId: null, pendingRoute: null, routeError: null, issues: [], thermal: null })
    } else {
      const circuit = document as StudioCircuit
      useStudio.setState({ partyActive: active, circuit: { name: circuit.name, qubits: circuit.qubits, gates: circuit.gates }, past: [], future: [], result: undefined, previousResult: undefined, selectedGateIds: [], stepIndex: null })
    }
  }
  return {
    get: (): PartyDocument => kind === "hardware" ? useHardware.getState().design : useStudio.getState().circuit,
    apply,
    subscribe: (changed: (before: PartyDocument, after: PartyDocument) => void) => kind === "hardware"
      ? useHardware.subscribe((state, previous) => { if (state.design !== previous.design) changed(previous.design, state.design) })
      : useStudio.subscribe((state, previous) => { if (state.circuit !== previous.circuit) changed(previous.circuit, state.circuit) }),
    operations: (before: PartyDocument, after: PartyDocument) => kind === "hardware"
      ? hardwareOperations(before as Design, after as Design)
      : circuitOperations(before as StudioCircuit, after as StudioCircuit),
  }
}
