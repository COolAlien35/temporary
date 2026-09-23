export const mockCohorts = [
  {
    id: "cohort-2024-fall",
    name: "Quantum Computing Fall Cohort",
    startDate: new Date(2024, 8, 1),
    endDate: new Date(2024, 11, 31),
    memberCount: 24,
    description: "Learn quantum algorithms from first principles.",
    instructors: ["Dr. Sarah Chen", "Prof. James Liu"],
  },
  {
    id: "cohort-2024-spring",
    name: "Quantum Computing Spring Cohort",
    startDate: new Date(2024, 0, 15),
    endDate: new Date(2024, 3, 30),
    memberCount: 18,
    description: "Advanced quantum circuits and optimization.",
    instructors: ["Dr. Michael Johnson"],
  },
]

export const mockMembers = [
  { id: "user-1", name: "Alice Wang", role: "Student", xp: 2450 },
  { id: "user-2", name: "Bob Martinez", role: "Student", xp: 1890 },
  { id: "user-3", name: "Carol Lee", role: "Instructor", xp: 5200 },
  { id: "user-4", name: "David Kumar", role: "Student", xp: 3120 },
  { id: "user-5", name: "Eva Schmidt", role: "Student", xp: 1670 },
]

export const mockLeaderboard = [
  { rank: 1, name: "Carol Lee", xp: 5200, streak: 24, badges: 12 },
  { rank: 2, name: "David Kumar", xp: 3120, streak: 18, badges: 8 },
  { rank: 3, name: "Alice Wang", xp: 2450, streak: 12, badges: 6 },
  { rank: 4, name: "Bob Martinez", xp: 1890, streak: 8, badges: 4 },
  { rank: 5, name: "Eva Schmidt", xp: 1670, streak: 5, badges: 3 },
]
