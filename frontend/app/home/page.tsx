import { AppShell } from "@/components/shared/AppShell"
import { CurrentModuleCard } from "@/components/dashboard/current-module-card"
import { AlgorithmsList } from "@/components/dashboard/algorithms-list"
import { PlaygroundCard } from "@/components/dashboard/playground-card"
import { TelemetryPanel } from "@/components/dashboard/telemetry-panel"
import { ConsistencyPanel } from "@/components/dashboard/consistency-panel"
import { DailyChallenge } from "@/components/dashboard/daily-challenge"
import { FacultyDispatch } from "@/components/dashboard/faculty-dispatch"
import { SectionDivider } from "@/components/home/accents/SectionDivider"

export default function HomePage() {
  return (
    <AppShell variant="roadmap">
      <div className="relative z-0">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <CurrentModuleCard />
            <SectionDivider />
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
      </div>
    </AppShell>
  )
}
