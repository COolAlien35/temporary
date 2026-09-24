export type ContestStatus = "Live" | "Upcoming" | "Ended"
export type Difficulty = "Beginner" | "Intermediate" | "Advanced"

export const contests = [
  { id: "entanglement-speed", title: "Entanglement Speed Challenge", status: "Live" as ContestStatus, difficulty: "Intermediate" as Difficulty, description: "Build a high-fidelity Bell state with the fewest gates.", countdown: "Ends in 2d 4h", participants: 142, accent: "cyan", problem: "Build a two-qubit circuit that produces a Bell state with fidelity above 95%. Your circuit should be readable, efficient, and reproducible.", rules: ["Correctness and fidelity: 60 points", "Gate efficiency: 25 points", "Submission speed: 15 points"] },
  { id: "ghz-frontier", title: "GHZ State Frontier", status: "Upcoming" as ContestStatus, difficulty: "Advanced" as Difficulty, description: "Scale a GHZ state across four qubits under a gate budget.", countdown: "Starts in 6h", participants: 88, accent: "violet", problem: "Create a four-qubit GHZ state while using no more than 8 entangling operations.", rules: ["State fidelity: 55 points", "Gate budget: 30 points", "Explanation quality: 15 points"] },
  { id: "measurement-lab", title: "Measurement Lab Sprint", status: "Ended" as ContestStatus, difficulty: "Beginner" as Difficulty, description: "Predict the measurement distribution of a prepared qubit.", countdown: "Final results posted", participants: 231, accent: "amber", problem: "Prepare a single qubit and explain its measurement probabilities from the circuit alone.", rules: ["Prediction accuracy: 70 points", "Circuit clarity: 30 points"] },
  { id: "noise-navigator", title: "Noise Navigator", status: "Live" as ContestStatus, difficulty: "Advanced" as Difficulty, description: "Design a circuit that stays stable under realistic noise.", countdown: "Ends in 5d 1h", participants: 64, accent: "green", problem: "Maximize output fidelity on a noisy simulator while preserving the target state.", rules: ["Noisy fidelity: 65 points", "Resource efficiency: 20 points", "Debug notes: 15 points"] },
]

export const leaderboard = [
  { rank: 1, username: "Ari Vega", initials: "AV", xp: 4820, badges: ["Top 3 Finisher", "First Blood"], streak: 21 },
  { rank: 2, username: "Noah Singh", initials: "NS", xp: 4510, badges: ["Module Master"], streak: 14 },
  { rank: 3, username: "Lena Park", initials: "LP", xp: 4280, badges: ["Debugger", "Community Helper"], streak: 18 },
  { rank: 4, username: "Maya Chen", initials: "MC", xp: 3910, badges: ["Consistent Learner"], streak: 12 },
  { rank: 5, username: "Theo Brooks", initials: "TB", xp: 3680, badges: ["Debugger"], streak: 8 },
]

export const threads = [
  { id: "t1", title: "How did you keep fidelity above 95%?", author: "Lena Park", initials: "LP", timestamp: "18 min ago", replies: 12, upvotes: 24, tags: ["Strategy", "Question"] },
  { id: "t2", title: "My simulator result differs from the expected state", author: "Theo Brooks", initials: "TB", timestamp: "2h ago", replies: 7, upvotes: 11, tags: ["Bug"] },
  { id: "t3", title: "Best gate-count heuristics for GHZ circuits", author: "Ari Vega", initials: "AV", timestamp: "Yesterday", replies: 19, upvotes: 38, tags: ["Strategy"] },
]

export const badges = [
  ["Top 3 Finisher", "Podium finish in any contest"], ["First Blood", "First correct submission"], ["Debugger", "Solved a Debug Mode challenge"], ["Consistent Learner", "Maintained a 7-day streak"], ["Module Master", "Reached 100% module mastery"], ["Community Helper", "Earned 10 upvoted answers"],
]

export function statusClass(status: ContestStatus) { return status === "Live" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : status === "Upcoming" ? "border-amber-400/30 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/5 text-white/50" }
export function difficultyClass(difficulty: Difficulty) { return difficulty === "Advanced" ? "text-fuchsia-300" : difficulty === "Intermediate" ? "text-cyan-300" : "text-emerald-300" }
    
