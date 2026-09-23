import { AppShell } from "@/components/shared/AppShell"
import { FadeInSection } from "@/components/profile/fade-in-section"
import { ProfileHero } from "@/components/profile/profile-hero"
import { StreakCard } from "@/components/profile/streak-card"
import { ActivityHeatmap } from "@/components/profile/activity-heatmap"
import { BadgeShelf } from "@/components/profile/badge-shelf"
import { MasteryLedger } from "@/components/profile/mastery-ledger"
import { CalibrationChart } from "@/components/profile/calibration-chart"
import { BlochSphereCard } from "@/components/profile/bloch-sphere-card"
import { ActivityTimeline } from "@/components/profile/activity-timeline"
import { SectionDivider } from "@/components/me/accents/SectionDivider"
import { BackToTop } from "@/components/me/accents/BackToTop"

const TRACE_SECTIONS = [
  { label: "Identity" },
  { label: "Streak" },
  { label: "Heatmap" },
  { label: "Badges" },
  { label: "Mastery" },
  { label: "Activity" },
]

export default function QuantumPassportPage() {
  return (
    <AppShell variant="passport" sections={TRACE_SECTIONS}>
      <div className="relative z-0 flex flex-col gap-6">
        <FadeInSection>
          <ProfileHero />
        </FadeInSection>

        <SectionDivider color="#F5B942" />

        <FadeInSection delay={0.05}>
          <StreakCard />
        </FadeInSection>

        <SectionDivider />

        <FadeInSection delay={0.05}>
          <ActivityHeatmap />
        </FadeInSection>

        <SectionDivider color="#F5B942" />

        <FadeInSection delay={0.05}>
          <BadgeShelf />
        </FadeInSection>

        <SectionDivider />

        <FadeInSection delay={0.05} className="grid gap-6 lg:grid-cols-2">
          <MasteryLedger />
          <CalibrationChart />
        </FadeInSection>

        <SectionDivider color="#F5B942" />

        <FadeInSection delay={0.05}>
          <BlochSphereCard />
        </FadeInSection>

        <SectionDivider />

        <FadeInSection delay={0.05}>
          <ActivityTimeline />
        </FadeInSection>
      </div>
      <BackToTop />
    </AppShell>
  )
}
