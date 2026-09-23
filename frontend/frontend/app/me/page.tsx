import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardFooter } from "@/components/dashboard/dashboard-footer"
import { FadeInSection } from "@/components/profile/fade-in-section"
import { ProfileHero } from "@/components/profile/profile-hero"
import { StreakCard } from "@/components/profile/streak-card"
import { ActivityHeatmap } from "@/components/profile/activity-heatmap"
import { BadgeShelf } from "@/components/profile/badge-shelf"
import { MasteryLedger } from "@/components/profile/mastery-ledger"
import { CalibrationChart } from "@/components/profile/calibration-chart"
import { BlochSphereCard } from "@/components/profile/bloch-sphere-card"
import { ActivityTimeline } from "@/components/profile/activity-timeline"

export default function QuantumPassportPage() {
  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      <DashboardNav />

      <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6">
        <FadeInSection>
          <ProfileHero />
        </FadeInSection>

        <FadeInSection delay={0.05}>
          <StreakCard />
        </FadeInSection>

        <FadeInSection delay={0.05}>
          <ActivityHeatmap />
        </FadeInSection>

        <FadeInSection delay={0.05}>
          <BadgeShelf />
        </FadeInSection>

        <FadeInSection delay={0.05} className="grid gap-6 lg:grid-cols-2">
          <MasteryLedger />
          <CalibrationChart />
        </FadeInSection>

        <FadeInSection delay={0.05}>
          <BlochSphereCard />
        </FadeInSection>

        <FadeInSection delay={0.05}>
          <ActivityTimeline />
        </FadeInSection>
      </main>

      <DashboardFooter />
    </div>
  )
}
