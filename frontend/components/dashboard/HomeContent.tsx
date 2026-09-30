"use client"

import Link from "next/link"
import { useSession } from "@/store/use-session"
import { CurrentModuleCard } from "@/components/dashboard/current-module-card"
import { AlgorithmsList } from "@/components/dashboard/algorithms-list"
import { PlaygroundCard } from "@/components/dashboard/playground-card"
import { TelemetryPanel } from "@/components/dashboard/telemetry-panel"
import { ConsistencyPanel } from "@/components/dashboard/consistency-panel"
import { DailyChallenge } from "@/components/dashboard/daily-challenge"
import { FacultyDispatch } from "@/components/dashboard/faculty-dispatch"
import { SectionDivider } from "@/components/home/accents/SectionDivider"
import { AssignedWorkCard } from "@/components/dashboard/assigned-work-card"
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card"

export function HomeContent() {
  const mode = useSession((state) => state.mode)
  const user = useSession((state) => state.user)

  if (mode === "connected" && user) {
    return <section className="relative z-0 mx-auto max-w-3xl rounded-2xl border border-[#4FD1E8]/25 bg-[#4FD1E8]/[0.05] p-6 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#4FD1E8]">Connected learning</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Welcome, {user.name}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">Your Superposition lesson, saved circuits, predictions, simulator runs, and tutor messages use your account. Open the lab to continue a saved round or start a new one.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/lab/superposition" className="rounded-full bg-[#4FD1E8] px-5 py-2.5 text-sm font-semibold text-[#0A0E17]">Open Superposition lab</Link>
        <Link href="/settings" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white">Account settings</Link>
      </div>
      <p className="mt-7 text-xs leading-5 text-white/45">Other learning areas are currently demo experiences and do not save progress to this account.</p>
    </section>
  }

  return <div className="relative z-0">
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <CurrentModuleCard />
        <SectionDivider />
        <AlgorithmsList />
        <PlaygroundCard />
      </div>
      <aside className="flex flex-col gap-4">
        <AssignedWorkCard />
        <RecentActivityCard />
        <TelemetryPanel />
        <ConsistencyPanel />
        <DailyChallenge />
        <FacultyDispatch />
      </aside>
    </div>
  </div>
}
