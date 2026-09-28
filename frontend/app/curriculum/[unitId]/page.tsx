import Link from "next/link"
import { notFound } from "next/navigation"
import { getUnit, units } from "@/lib/curriculum/units"
import { LessonList } from "@/components/curriculum/CurriculumUI"
import { UnitAssignments } from "@/components/coursework/UnitAssignments"
import { AppShell } from "@/components/shared/AppShell"
import { UnitResume } from "@/components/curriculum/UnitResume"
import { getAlgorithmConfig } from "@/lib/algorithms"
import { getAlgorithm } from "@/lib/lab-data"

const unitAlgorithms: Record<string, string[]> = { u4: ["deutsch-jozsa"], u5: ["grovers", "qft", "shor"], u6: ["qaoa", "vqe"], u7: ["qec"] }

export function generateStaticParams() { return units.map((unit) => ({ unitId: unit.id })) }

export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params
  const unit = getUnit(unitId)
  if (!unit) notFound()
  return <AppShell variant="curriculum"><div className="mx-auto min-h-screen max-w-5xl px-5 py-8 text-white md:px-10">
    <Link href="/curriculum" className="text-sm text-[#00D4FF]">← Curriculum path</Link>
    <header className="mt-6 rounded-3xl border border-white/10 bg-white/[.04] p-7">
      <p className="text-sm uppercase tracking-[.25em] text-[#00D4FF]">{unit.level} · Unit {units.findIndex((item) => item.id === unit.id) + 1} · {unit.minutes} minutes</p>
      <h1 className="mt-3 text-4xl font-semibold">{unit.title}</h1><p className="mt-3 max-w-2xl text-white/60">{unit.tagline}</p>
      <p className="mt-5 text-sm text-[#F5B942]">Badge: {unit.badge} · {unit.xpTotal} XP available</p>
      <UnitResume unit={unit} />
    </header>
    <section className="mt-8"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-white/40">Learn in order</p><h2 className="mt-1 text-2xl font-semibold">Lessons</h2></div><Link href={`/curriculum/${unit.id}/quiz`} className="rounded-xl bg-[#00D4FF] px-4 py-2.5 text-sm font-semibold text-[#0A0E17]">Take unit quiz</Link></div><LessonList unit={unit} /></section>
    {unit.tools.length > 0 && <section className="mt-8 rounded-2xl border border-[#00D4FF]/20 bg-[#00D4FF]/[.04] p-5"><h2 className="font-semibold">Tools for this unit</h2><p className="mt-1 text-sm text-white/55">Try the idea in a hands-on workspace, then return here to continue.</p><div className="mt-3 flex flex-wrap gap-2">{unit.tools.map((tool) => <span key={tool} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65">{tool}</span>)}</div></section>}
    {({ u1: ["superposition", "Superposition lab"], u2: ["gates", "Gate toolkit lab"], u3: ["entanglement", "Entanglement lab"] } as Record<string, [string, string]>)[unit.id] && <Link href={`/lab/${({ u1: "superposition", u2: "gates", u3: "entanglement" } as Record<string, string>)[unit.id]}`} className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-[#00D4FF]/35 px-4 py-2.5 text-sm font-medium text-[#00D4FF] hover:bg-[#00D4FF]/10">Open guided {({ u1: "Superposition lab", u2: "Gate toolkit lab", u3: "Entanglement lab" } as Record<string, string>)[unit.id]} →</Link>}
    {unitAlgorithms[unit.id] && <section className="mt-8 rounded-2xl border border-[#00D4FF]/20 bg-[#00D4FF]/[.04] p-5"><h2 className="font-semibold">Algorithm workbenches</h2><p className="mt-1 text-sm text-white/55">Open the related experiment. Tracks marked unavailable have not been filled with another algorithm&apos;s content.</p><div className="mt-4 flex flex-wrap gap-2">{unitAlgorithms[unit.id].map((slug) => { const config = getAlgorithmConfig(slug); const available = slug === "qaoa" || slug === "vqe" || Boolean(getAlgorithm(slug)); return <Link key={slug} href={`/lab/${slug}`} className={`rounded-xl border px-4 py-2.5 text-sm ${available ? "border-[#00D4FF]/35 text-[#00D4FF] hover:bg-[#00D4FF]/10" : "border-white/10 text-white/45"}`}>{config?.meta.title ?? slug}{available ? " →" : " · unavailable"}</Link> })}</div></section>}
    <UnitAssignments unitId={unit.id} />
  </div></AppShell>
}
