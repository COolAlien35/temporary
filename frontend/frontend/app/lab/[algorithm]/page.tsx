import { LabShell } from "@/components/lab/lab-shell"

export default async function LabPage({
  params,
  searchParams,
}: {
  params: Promise<{ algorithm: string }>
  searchParams: Promise<{ stage?: string }>
}) {
  const { algorithm } = await params
  const { stage } = await searchParams
  const initialStage = stage ? Math.min(9, Math.max(1, Number.parseInt(stage, 10) || 1)) : 1

  return <LabShell algorithmSlug={algorithm} initialStage={initialStage} />
}
