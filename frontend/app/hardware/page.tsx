import Link from "next/link"
import { ArrowRight, BookOpen, Gauge, Snowflake, Wrench } from "lucide-react"
import { AppShell } from "@/components/shared/AppShell"
import { PageHeader } from "@/components/shared/ui/PageHeader"
import { GlassCard } from "@/components/shared/ui/GlassCard"
import { Reveal } from "@/components/shared/ui/Reveal"
import { SectionDivider } from "@/components/shared/ui/SectionDivider"
import { CountUp } from "@/components/shared/ui/CountUp"
import { COMPONENTS } from "@/lib/hardware/components"
import { LINE_LIST } from "@/lib/hardware/lines"
import { RULES } from "@/lib/hardware/rules"
import { STAGE_LIST } from "@/lib/hardware/stages"

const NAV_CARDS = [
  {
    href: "/hardware/catalog",
    icon: BookOpen,
    title: "Component Catalog",
    description: "Browse every cryostat component with specs, ports, and a full stage-compatibility matrix.",
  },
  {
    href: "/hardware/studio",
    icon: Wrench,
    title: "Builder Studio",
    description: "Drag components onto temperature stages and route XY, flux, readout, and DC lines between them.",
  },
  {
    href: "/hardware/checks",
    icon: Gauge,
    title: "System Checks",
    description: "See the validation rules and thermal budgets the studio uses to catch invalid wiring.",
  },
]

export default function HardwareOverviewPage() {
  return (
    <AppShell variant="hardware">
      <PageHeader
        eyebrow="Hardware Studio"
        title="Design the wiring inside a dilution refrigerator"
        description="A superconducting qubit doesn't just need a chip — it needs dozens of attenuators, filters, amplifiers, and cables threaded correctly through six temperature stages, from 300K down to 10mK. This studio lets you build and validate that wiring."
      />

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {NAV_CARDS.map((card, i) => (
          <Reveal key={card.href} delay={i * 0.08}>
            <Link href={card.href}>
              <GlassCard className="h-full">
                <card.icon className="mb-3 h-5 w-5 text-[#00D4FF]" />
                <p className="mb-1.5 font-semibold text-white">{card.title}</p>
                <p className="mb-3 text-sm text-white/60">{card.description}</p>
                <span className="flex items-center gap-1 text-xs font-medium text-[#00D4FF]">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </GlassCard>
            </Link>
          </Reveal>
        ))}
      </div>

      <SectionDivider />
      <p className="-mt-4 mb-4 text-center text-xs font-semibold uppercase tracking-wider text-white/40">At a glance</p>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Stages", value: STAGE_LIST.length, icon: Snowflake },
          { label: "Components", value: COMPONENTS.length, icon: Wrench },
          { label: "Line types", value: LINE_LIST.length, icon: Gauge },
          { label: "Validation rules", value: RULES.length, icon: BookOpen },
        ].map((stat) => (
          <GlassCard key={stat.label} interactive={false} className="text-center">
            <stat.icon className="mx-auto mb-2 h-4 w-4 text-white/40" />
            <p className="text-2xl font-bold text-white">
              <CountUp to={stat.value} />
            </p>
            <p className="text-xs text-white/50">{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      <SectionDivider />
      <p className="-mt-4 mb-4 text-center text-xs font-semibold uppercase tracking-wider text-white/40">Why it&apos;s hard</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Reveal>
          <GlassCard>
            <p className="mb-1.5 font-semibold text-white">Six stages, six budgets</p>
            <p className="text-sm text-white/60">
              300K, 50K, 4K, Still, Cold Plate, and the mixing chamber each have their own cooling power. Every cable and component you add
              dissipates heat that has to be paid for out of that budget — miss it, and the fridge never reaches base temperature.
            </p>
          </GlassCard>
        </Reveal>
        <Reveal delay={0.08}>
          <GlassCard>
            <p className="mb-1.5 font-semibold text-white">Four signal chains, one qubit</p>
            <p className="text-sm text-white/60">
              XY drive, flux bias, readout in, and readout out all need different attenuation, filtering, and amplification — and they all have
              to survive the trip from room temperature to the qubit without adding noise or heat.
            </p>
          </GlassCard>
        </Reveal>
      </div>
    </AppShell>
  )
}
