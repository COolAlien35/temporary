import Link from "next/link"
import { LabShell } from "@/components/lab/lab-shell"
import { getAlgorithmConfig } from "@/lib/algorithms"

export default async function LabPage({ params, searchParams }: { params: Promise<{ algorithm: string }>; searchParams: Promise<{ stage?: string }> }) {
  const { algorithm: raw } = await params
  const algorithm = raw === "grover" ? "grovers" : raw
  const { stage } = await searchParams
  const initialStage = stage ? Math.min(9, Math.max(1, Number.parseInt(stage, 10) || 1)) : 1
  if (!getAlgorithmConfig(algorithm)) return <main className="flex min-h-screen items-center justify-center bg-[#0A0E17] p-6 text-white"><div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center"><h1 className="text-xl font-semibold">Algorithm not found</h1><p className="mt-2 text-sm text-white/60">That lab track is not in the roadmap yet.</p><Link className="mt-6 inline-flex rounded-lg bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#061018]" href="/home">Back to Roadmap</Link></div></main>
  return <LabShell algorithmSlug={algorithm} initialStage={initialStage} />
}
