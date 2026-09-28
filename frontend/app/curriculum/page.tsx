import Link from "next/link"
import { CourseHero, UnitCard } from "@/components/curriculum/CurriculumUI"
import { units } from "@/lib/curriculum/units"
import { AppShell } from "@/components/shared/AppShell"

export default function CurriculumPage() {
  return (
    <AppShell variant="curriculum">
      <div className="relative z-0 min-h-screen px-5 py-10 md:px-10">
        <div className="mx-auto max-w-7xl">
          <CourseHero />
          <div className="mt-10 flex items-end justify-between">
            <div>
              <p className="text-sm uppercase tracking-[.25em] text-[#F5B942]">Course map</p>
              <h2 className="mt-2 text-3xl font-semibold">Nine units. One quantum engineer.</h2>
            </div>
            <div className="flex flex-wrap gap-3"><Link href="/assignments" className="rounded-xl bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#0A0E17]">Assigned work</Link><Link href="/curriculum/practice" className="rounded-xl border border-[#00D4FF]/40 px-4 py-2 text-sm text-[#00D4FF]">Practice review</Link></div>
          </div>
          <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{units.map((unit, index) => <li key={unit.id}><UnitCard unit={unit} index={index} /></li>)}</ol>
          <div className="mt-8 rounded-2xl border border-[#F5B942]/20 bg-[#F5B942]/5 p-5 text-sm text-white/60">Content pending faculty review. Use the linked labs and studios to turn each concept into an experiment.</div>
        </div>
      </div>
    </AppShell>
  )
}
