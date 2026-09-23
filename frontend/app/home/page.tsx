import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { CurrentModuleCard } from "@/components/dashboard/current-module-card"
import { AlgorithmsList } from "@/components/dashboard/algorithms-list"
import { PlaygroundCard } from "@/components/dashboard/playground-card"
import { TelemetryPanel } from "@/components/dashboard/telemetry-panel"
import { ConsistencyPanel } from "@/components/dashboard/consistency-panel"
import { DailyChallenge } from "@/components/dashboard/daily-challenge"
import { FacultyDispatch } from "@/components/dashboard/faculty-dispatch"
import { DashboardFooter } from "@/components/dashboard/dashboard-footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      <DashboardNav />

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <CurrentModuleCard />
            <AlgorithmsList />
            <PlaygroundCard />
          </div>

          <aside className="flex flex-col gap-4">
            <TelemetryPanel />
            <ConsistencyPanel />
            <DailyChallenge />
            <FacultyDispatch />
          </aside>
        </div>
      </main>

      <DashboardFooter />
    </div>
  )
}
