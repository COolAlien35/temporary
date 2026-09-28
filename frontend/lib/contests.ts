export type ContestStatus = "Live" | "Upcoming" | "Ended"
export type Difficulty = "Beginner" | "Intermediate" | "Advanced"

export const contests = [
  { id: "entanglement-speed", title: "Entanglement Speed Challenge", status: "Live" as ContestStatus, difficulty: "Intermediate" as Difficulty, description: "Build a Bell state with a short circuit in the local demo.", countdown: "Demo round · no live clock", participants: 142, accent: "cyan", challengeId: "bell-pair", problem: "Build a two-qubit Bell pair. The local circuit challenge checks the output distribution and a three-gate budget; its score becomes your demo contest result.", rules: ["Local Bell-pair challenge score", "Three-gate budget", "Retries keep their own submitted snapshots"] },
  { id: "ghz-frontier", title: "GHZ State Frontier", status: "Upcoming" as ContestStatus, difficulty: "Advanced" as Difficulty, description: "Scale a GHZ state across four qubits under a gate budget.", countdown: "Sample upcoming contest", participants: 88, accent: "violet", challengeId: null, problem: "Create a four-qubit GHZ state while using no more than 8 entangling operations.", rules: ["State fidelity: 55 points", "Gate budget: 30 points", "Explanation quality: 15 points"] },
  { id: "measurement-lab", title: "Measurement Lab Sprint", status: "Ended" as ContestStatus, difficulty: "Beginner" as Difficulty, description: "Predict the measurement distribution of a prepared qubit.", countdown: "Sample results", participants: 231, accent: "amber", challengeId: null, problem: "Prepare a single qubit and explain its measurement probabilities from the circuit alone.", rules: ["Prediction accuracy: 70 points", "Circuit clarity: 30 points"] },
  { id: "noise-navigator", title: "Noise Navigator", status: "Live" as ContestStatus, difficulty: "Advanced" as Difficulty, description: "Explore circuit stability under noise; graded entry needs a backend.", countdown: "Sample contest preview", participants: 64, accent: "green", challengeId: null, problem: "Maximize output fidelity on a noisy simulator while preserving the target state. A trusted noisy-circuit grader is not connected in this frontend demo.", rules: ["Noisy fidelity: 65 points", "Resource efficiency: 20 points", "Debug notes: 15 points"] },
]

export const badges = [
  ["Top 3 Finisher", "Podium finish in any contest"], ["First Blood", "First correct submission"], ["Debugger", "Solved a Debug Mode challenge"], ["Consistent Learner", "Maintained a 7-day streak"], ["Module Master", "Reached 100% module mastery"], ["Community Helper", "Earned 10 upvoted answers"],
]

export function statusClass(status: ContestStatus) { return status === "Live" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : status === "Upcoming" ? "border-amber-400/30 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/5 text-white/50" }
export function difficultyClass(difficulty: Difficulty) { return difficulty === "Advanced" ? "text-fuchsia-300" : difficulty === "Intermediate" ? "text-cyan-300" : "text-emerald-300" }
    
