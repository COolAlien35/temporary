import type { Question } from "./types"
export const questions: Question[] = [
{id:"q-foundations",prompt:"After applying H to |0⟩, what is P(|1⟩)?",options:["0", "1/2", "1", "It depends on the global phase"],answer:1,explanation:"H|0⟩=(|0⟩+|1⟩)/√2, so each outcome has probability 1/2.",tags:["superposition","measurement"],xp:2},
{id:"q-grover",prompt:"What speedup does ideal Grover search provide over an unstructured classical search?",options:["Exponential", "Quadratic", "None", "It solves every search in one step"],answer:1,explanation:"Grover reduces query complexity from O(N) to O(√N), a quadratic speedup.",tags:["grover"],xp:2},
{id:"q-shor",prompt:"What hardware assumption is important for large-scale Shor factoring?",options:["Noisy hardware is enough", "Fault-tolerant hardware at scale", "Only a classical GPU", "No error correction"],answer:1,explanation:"Large Shor instances require error-corrected, fault-tolerant quantum hardware.",tags:["shor","error-correction"],xp:2},
{id:"q-entangle",prompt:"Which operation commonly creates a Bell state from |00⟩?",options:["H on qubit 0 followed by CNOT", "X on both qubits", "Measurement only", "Two unrelated Z gates"],answer:0,explanation:"H creates superposition and CNOT correlates the branches.",tags:["entanglement"],xp:2},
{id:"q-t1",prompt:"T1 primarily describes what in a superconducting qubit?",options:["Energy relaxation", "Classical clock rate", "Readout bandwidth", "Room temperature"],answer:0,explanation:"T1 is the characteristic energy-relaxation time.",tags:["noise","T1"],xp:2},
]
export const getQuizQuestions = (unitId: string, count = 10) => questions.slice(0, count).map((q) => ({...q, id: `${unitId}-${q.id}`}))
