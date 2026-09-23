"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import { useState } from "react"
import { AtomSvg } from "@/components/quantumloop/atom-svg"
import { DashboardFooter } from "@/components/dashboard/dashboard-footer"
import { ParallaxBackdrop, type TraceSection } from "@/components/shared/ParallaxBackdrop"
import { CommandPalette } from "@/components/shared/CommandPalette"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "Roadmap", href: "/home", layoutId: "nav-roadmap" },
  { label: "Curriculum", href: "/curriculum", layoutId: "nav-curriculum" },
  { label: "Circuit Studio", href: "/studio", layoutId: "nav-studio" },
  { label: "Cohorts", href: "/cohorts", layoutId: "nav-cohorts" },
  { label: "Docs", href: "/docs", layoutId: "nav-docs" },
]

export function AppShell({
  children,
  variant = "roadmap",
  sections,
  userName = "Maya Chen",
}: {
  children: React.ReactNode
  variant?: "roadmap" | "passport" | "studio" | "curriculum" | "cohorts" | "docs"
  sections?: TraceSection[]
  userName?: string
}) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const streakDays = 12

  const getActiveLink = () => {
    if (pathname === "/home" || pathname === "/") return "Roadmap"
    if (pathname.startsWith("/curriculum")) return "Curriculum"
    if (pathname.startsWith("/studio")) return "Circuit Studio"
    if (pathname.startsWith("/cohorts")) return "Cohorts"
    if (pathname.startsWith("/docs")) return "Docs"
    return null
  }

  const activeLink = getActiveLink()

  return (
    <div className="relative min-h-screen bg-[#0A0E17] text-white">
      <ParallaxBackdrop variant={variant as any} sections={sections} />
      <CommandPalette />

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
          <nav className="hidden items-center gap-5 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative py-1 text-xs font-medium text-white/50 transition-colors hover:text-white/80"
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
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Streak Pill */}
            <div className="hidden items-center gap-1.5 rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-2.5 py-1 text-[11px] font-medium text-[#FFB800] sm:flex">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                <path d="M12 2c1 3-1 4.5-2.5 6C8 9.5 7 11 7 13a5 5 0 0 0 10 0c0-1.6-.6-2.7-1.3-3.7.4 2-.3 3.2-1.4 3.7-.2-2.2-1.2-3.3-2.3-4.3C13.1 7.8 13.4 5 12 2Z" />
              </svg>
              {streakDays} days
            </div>

            {/* User Name */}
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-white">{userName}</p>
            </div>

            {/* Avatar */}
            <Link
              href="/me"
              aria-label="View Quantum Passport profile"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#4FD1E8] text-[11px] font-semibold text-[#0A0E17] transition-transform hover:scale-105"
            >
              {userName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Link>

            {/* Settings Button */}
            <button
              type="button"
              aria-label="Settings"
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 21 10h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              aria-label="Log out"
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex md:hidden h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
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
            className="border-t border-white/10 bg-[#0A0E17]/95 backdrop-blur-sm md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
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
            </nav>
          </motion.div>
        )}
      </motion.header>

      {/* Main Content */}
      <main className="relative z-0 mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>

      {/* Footer */}
      <DashboardFooter />
    </div>
  )
}
