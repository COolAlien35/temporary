import type { Question } from "./types"

const question = (id: string, prompt: string, options: string[], answer: number, explanation: string, tags: string[]): Question => ({ id, prompt, options, answer, explanation, tags, xp: 2 })

export const questionsByUnit: Record<string, Question[]> = {
  u1: [
    question("u1-born-rule", "For |ψ⟩ = α|0⟩ + β|1⟩, what is the probability of measuring 1?", ["|β|²", "β", "|α|² + |β|²", "Always 1/2"], 0, "Born's rule squares the magnitude of the amplitude: P(1) = |β|².", ["measurement"]),
    question("u1-hadamard", "After applying H to |0⟩, what is P(|1⟩)?", ["0", "1/2", "1", "It depends on global phase"], 1, "H|0⟩ = (|0⟩ + |1⟩)/√2, so both outcomes have probability 1/2.", ["superposition"]),
    question("u1-phase", "Which phase cannot change observable measurement probabilities?", ["A global phase on the whole state", "A relative phase between basis states", "A phase before interference", "A phase on one basis state"], 0, "A global phase multiplies every amplitude equally and has no observable effect.", ["phase"]),
  ],
  u2: [
    question("u2-x", "What does X do to |0⟩?", ["Maps it to |1⟩", "Creates equal amplitudes", "Measures it", "Adds phase to |1⟩"], 0, "X swaps |0⟩ and |1⟩.", ["gates"]),
    question("u2-cnot", "When does CNOT flip its target?", ["When the control is |1⟩", "Every time it runs", "When the target is |0⟩", "Only after measurement"], 0, "CNOT applies X to the target conditioned on the control being |1⟩.", ["circuits"]),
    question("u2-bell", "What state results from H on q0 then CNOT(q0,q1) applied to |00⟩?", ["(|00⟩ + |11⟩)/√2", "|01⟩", "(|00⟩ + |01⟩)/√2", "|11⟩"], 0, "H creates two branches and CNOT correlates the second qubit with the first.", ["entanglement"]),
  ],
  u3: [
    question("u3-factor", "What is the defining property of an entangled pure state?", ["It cannot be factored into independent states for each subsystem", "Every qubit is measured as 1", "Its probabilities fail to normalize", "It contains no correlations"], 0, "Entanglement means the joint state cannot be written as a product of individual subsystem states.", ["entanglement"]),
    question("u3-bell", "For the Bell state (|00⟩ + |11⟩)/√2, if q0 is measured as 0, what is q1?", ["0", "1", "Random and independent", "Not measurable"], 0, "The outcomes are perfectly correlated: observing 0 on q0 leaves q1 at 0.", ["correlations"]),
    question("u3-signal", "Can entanglement alone send a controllable message faster than light?", ["No; local outcomes remain random", "Yes, by choosing a Bell state", "Yes, after measuring both qubits", "Only with three qubits"], 0, "Entanglement creates correlations, but the local measurement result is random and cannot carry a chosen message.", ["no-signalling"]),
  ],
  u4: [question("u4-oracle", "What role does an oracle play in a query algorithm?", ["It encodes a problem-dependent operation", "It measures every qubit", "It removes all noise", "It guarantees an answer in one step"], 0, "The oracle represents the problem-specific function queried by the algorithm.", ["oracles"])],
  u5: [question("u5-grover", "What speedup does ideal Grover search provide over unstructured classical search?", ["Exponential", "Quadratic", "None", "It solves every search in one step"], 1, "Grover reduces query complexity from O(N) to O(√N), a quadratic speedup.", ["grover"])],
  u6: [question("u6-variational", "What is optimized in a variational quantum algorithm?", ["Parameters of a circuit using a classical feedback loop", "The number of measurement devices", "A global phase only", "The qubit labels"], 0, "A classical optimizer updates circuit parameters based on measured objective values.", ["variational"])],
  u7: [question("u7-t1", "T1 primarily describes what in a superconducting qubit?", ["Energy relaxation", "Classical clock rate", "Readout bandwidth", "Room temperature"], 0, "T1 is the characteristic energy-relaxation time.", ["noise"]), question("u7-qec", "Why use quantum error correction?", ["To detect and correct errors without directly measuring the encoded logical state", "To make gates unnecessary", "To eliminate the need for repeated measurements", "To turn quantum data into classical copies"], 0, "Error-correcting codes use redundant physical qubits and syndrome measurements to protect logical information.", ["error-correction"])],
  u8: [question("u8-reproducible", "What should you record to make a circuit experiment reproducible?", ["Circuit, input state, measurement setup and run settings", "Only the final histogram", "The color of the editor", "A screenshot with no circuit"], 0, "A useful experiment record includes the circuit and conditions that produced the results.", ["experiments"])],
  u9: [question("u9-t1", "What does a cryostat do in a superconducting quantum computer?", ["Cools the processor to cryogenic temperatures", "Compiles quantum circuits", "Performs error correction in software", "Measures classical clock speed"], 0, "Superconducting processors operate at very low temperatures to reduce thermal excitations.", ["hardware"])],
}

export const questions: Question[] = Object.values(questionsByUnit).flat()
export const getQuizQuestions = (unitId: string) => questionsByUnit[unitId] ?? []
