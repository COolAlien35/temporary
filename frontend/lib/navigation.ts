export const primaryNavigation = [
  { label: "Roadmap", href: "/home" },
  { label: "Curriculum", href: "/curriculum" },
  { label: "Circuit Studio", href: "/studio" },
  { label: "Contests", href: "/contests" },
  { label: "Challenges", href: "/challenges" },
  { label: "Instructor", href: "/instructor" },
] as const

export const hardwareNavigation = [
  { label: "Overview", href: "/hardware", description: "What the Hardware Studio is for" },
  { label: "Component Catalog", href: "/hardware/catalog", description: "Browse cryostat hardware and wiring rules" },
  { label: "Builder Studio", href: "/hardware/studio", description: "Design a fridge wiring diagram" },
  { label: "System Checks", href: "/hardware/checks", description: "Validation rules and thermal budgets" },
] as const

export const secondaryNavigation = [
  { label: "Quantum Passport", href: "/me" },
  { label: "Assigned Work", href: "/assignments" },
  { label: "Practice", href: "/curriculum/practice" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Discussions", href: "/discussions" },
] as const

export function activeNavigation(pathname: string): string | null {
  if (pathname === "/home" || pathname === "/") return "Roadmap"
  if (pathname.startsWith("/curriculum")) return "Curriculum"
  if (pathname.startsWith("/assignments")) return "Curriculum"
  if (pathname.startsWith("/studio")) return "Circuit Studio"
  if (pathname.startsWith("/challenges")) return "Challenges"
  if (pathname.startsWith("/contests") || pathname.startsWith("/leaderboard") || pathname.startsWith("/discussions")) return "Contests"
  if (pathname.startsWith("/instructor")) return "Instructor"
  if (pathname.startsWith("/hardware")) return "Hardware Studio"
  return null
}
