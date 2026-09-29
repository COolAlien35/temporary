"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { AtomSvg } from "@/components/quantumloop/atom-svg"
import { DashboardFooter } from "@/components/dashboard/dashboard-footer"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { useSession } from "@/store/use-session"
import { signOutConnected } from "@/lib/services/connected-auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { activeNavigation, hardwareNavigation, primaryNavigation } from "@/lib/navigation"

const CommandPalette = dynamic(() => import("@/components/shared/CommandPalette").then((module) => module.CommandPalette), { ssr: false })

const BACKDROP_GRADIENT: Record<string, string> = {
  roadmap: "radial-gradient(ellipse at 18% 22%, rgba(74,222,128,.06), transparent 55%), #0A0E17",
  passport: "radial-gradient(ellipse at 20% 22%, rgba(0,212,255,.07), transparent 58%), #0A0E17",
  studio: "radial-gradient(ellipse at 80% 15%, rgba(0,212,255,.11), transparent 55%), #0A0E17",
  hardware: "radial-gradient(ellipse at 52% 5%, rgba(0,212,255,.12), transparent 56%), radial-gradient(ellipse at 95% 85%, rgba(125,211,252,.06), transparent 45%), #0A0E17",
  curriculum: "radial-gradient(ellipse at 20% 25%, rgba(74,222,128,.07), transparent 55%), #0A0E17",
  cohorts: "radial-gradient(ellipse at 20% 20%, rgba(245,185,66,.08), transparent 55%), #0A0E17",
  instructor: "radial-gradient(ellipse at 20% 20%, rgba(245,185,66,.08), transparent 55%), #0A0E17",
  docs: "radial-gradient(ellipse at 50% 0%, rgba(0,212,255,.08), transparent 60%), #0A0E17",
}

export function AppShell({
  children,
  variant = "roadmap",
  userName = "Demo Explorer",
  disableBackdrop = false,
}: {
  children: React.ReactNode
  variant?: "roadmap" | "passport" | "studio" | "curriculum" | "cohorts" | "docs" | "hardware" | "instructor"
  userName?: string
  disableBackdrop?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [paletteReady, setPaletteReady] = useState(false)
  const [mounted, setMounted] = useState(false)
  const sessionUser = useSession((state) => state.user)
  const sessionMode = useSession((state) => state.mode)
  const endSession = useSession((state) => state.endSession)
  const switchLearner = useLearnerProgress((state) => state.switchLearner)
  const activeLearnerId = useLearnerProgress((state) => state.activeLearnerId)
  const streakDays = useLearnerProgress((state) => state.streak)
  const displayName = mounted && sessionUser ? sessionUser.name : userName

  // The hardware store persists to localStorage but is created with
  // `skipHydration: true` so the server-rendered markup always matches the
  // client's pre-hydration state. Rehydrate manually once mounted.
  useEffect(() => {
    setMounted(true)
    if (pathname === "/hardware/studio" || pathname === "/hardware/checks") {
      void import("@/store/use-hardware").then(({ useHardware }) => useHardware.persist.rehydrate())
    }
  }, [pathname])

  useEffect(() => {
    if (paletteReady) return
    function activatePalette(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) return
      event.preventDefault()
      setPaletteReady(true)
    }
    document.addEventListener("keydown", activatePalette)
    return () => document.removeEventListener("keydown", activatePalette)
  }, [paletteReady])

  useEffect(() => {
    if (mounted && activeLearnerId !== (sessionUser?.id ?? null)) switchLearner(sessionUser?.id ?? null)
  }, [mounted, activeLearnerId, sessionUser?.id, switchLearner])

  const activeLink = activeNavigation(pathname)

  return (
    <div data-hydrated={mounted} className="relative min-h-screen bg-[#0A0E17] text-white">
      {!disableBackdrop && <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" style={{ background: BACKDROP_GRADIENT[variant] }} />}
      {paletteReady && <CommandPalette initialOpen />}

      {/* Top Navigation */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0E17]/95 backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <AtomSvg className="h-5 w-5 text-[#00D4FF]" />
            <span className="text-sm font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              QuantumLoop
            </span>
            <span className="relative ml-1 flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ADE80] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
            {primaryNavigation.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  link.label === "Contests"
                    ? "border border-[#F5B942]/40 bg-[#F5B942]/10 text-[#F5B942] hover:border-[#F5B942]/70 hover:bg-[#F5B942]/20"
                    : "py-1 text-white/50 hover:text-white/80",
                )}
              >
                {link.label}
                {activeLink === link.label && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[#00D4FF] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="relative flex items-center gap-1 py-1 text-xs font-medium text-white/50 transition-colors hover:text-white/80 focus:outline-none"
                  />
                }
              >
                Hardware Studio
                <ChevronDown className="h-3 w-3" />
                {activeLink === "Hardware Studio" && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[#00D4FF] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 border-white/10 bg-[#10141F] text-white">
                {hardwareNavigation.map((link) => (
                  <DropdownMenuItem
                    key={link.href}
                    render={<Link href={link.href} />}
                    className="flex flex-col items-start gap-0.5 py-2 cursor-pointer focus:bg-white/10 focus:text-white"
                  >
                    <span className="text-xs font-medium text-white">{link.label}</span>
                    <span className="text-[11px] text-white/50">{link.description}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Streak Pill */}
            {mounted && sessionUser && <div className="hidden items-center gap-1.5 rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-2.5 py-1 text-[11px] font-medium text-[#FFB800] sm:flex">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                <path d="M12 2c1 3-1 4.5-2.5 6C8 9.5 7 11 7 13a5 5 0 0 0 10 0c0-1.6-.6-2.7-1.3-3.7.4 2-.3 3.2-1.4 3.7-.2-2.2-1.2-3.3-2.3-4.3C13.1 7.8 13.4 5 12 2Z" />
              </svg>
              {streakDays} days
            </div>}

            {/* User Name */}
            <div className="hidden text-right sm:block">
              {pathname.startsWith("/instructor") && <p className="mb-0.5 text-[9px] uppercase tracking-[.16em] text-[#F5B942]">Instructor view</p>}
              <p className="text-xs font-medium text-white">{displayName}</p>
            </div>

            {/* Avatar */}
            <Link
              href="/me"
              aria-label="View Quantum Passport profile"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#4FD1E8] text-[11px] font-semibold text-[#0A0E17] transition-transform hover:scale-105"
            >
              {displayName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Link>

            {/* Settings Button */}
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 21 10h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </Link>

            {mounted && sessionUser ? <button
              type="button"
              aria-label="Log out"
              onClick={async () => {
                try {
                  if (sessionMode === "connected") await signOutConnected()
                  switchLearner(null)
                  endSession()
                  router.push("/")
                } catch {
                  toast.error("Could not sign out. Please retry.")
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button> : <Link href="/login" className="hidden text-xs font-medium text-[#00D4FF] sm:inline">Log in</Link>}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex lg:hidden h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-t border-white/10 bg-[#0A0E17]/95 backdrop-blur-sm lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Mobile">
              {primaryNavigation.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    activeLink === link.label ? "bg-white/10 text-white" : "text-white/70 hover:text-white/90",
                  )}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <p className="px-3 pt-2 text-[10px] font-medium uppercase tracking-wider text-white/30">Hardware Studio</p>
              {hardwareNavigation.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === link.href ? "bg-white/10 text-white" : "text-white/70 hover:text-white/90",
                  )}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>

      {/* Footer */}
      <div className="relative z-10"><DashboardFooter /></div>
    </div>
  )
}
