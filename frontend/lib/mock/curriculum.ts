export const mockCurriculumModules = [
  {
    id: "module-foundations",
    title: "Quantum Foundations",
    description: "Linear algebra, superposition, entanglement",
    difficulty: "BEGINNER",
    lessons: 5,
    completed: 3,
    estimatedHours: 8,
  },
  {
    id: "module-algorithms",
    title: "Core Quantum Algorithms",
    description: "Deutsch–Jozsa, Grover's, QFT, Shor's",
    difficulty: "INTERMEDIATE",
    lessons: 8,
    completed: 2,
    estimatedHours: 16,
  },
  {
    id: "module-circuits",
    title: "Circuit Design Patterns",
    description: "Gate optimization, measurement, simulation",
    difficulty: "INTERMEDIATE",
    lessons: 6,
    completed: 0,
    estimatedHours: 12,
  },
  {
    id: "module-error",
    title: "Quantum Error Correction",
    description: "Surface codes, fault tolerance, noise models",
    difficulty: "ADVANCED",
    lessons: 7,
    completed: 0,
    estimatedHours: 18,
  },
]

export const mockAssignments = [
  {
    id: "assignment-1",
    title: "Build Deutsch–Jozsa Circuit",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    module: "module-algorithms",
    status: "in-progress",
  },
  {
    id: "assignment-2",
    title: "Optimize 3-qubit Grover Search",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    module: "module-algorithms",
    status: "not-started",
  },
]
