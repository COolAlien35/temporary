"use client"

import { LabProvider, useLab } from "@/lib/lab-context"
import { TopBar } from "@/components/lab/top-bar"
import { LeftSidebar } from "@/components/lab/left-sidebar"
import { RightSidebar } from "@/components/lab/right-sidebar"
import { BottomBar } from "@/components/lab/bottom-bar"
import { StageLearn } from "@/components/lab/stages/stage-learn"
import { StagePredict } from "@/components/lab/stages/stage-predict"
import { StageBuild } from "@/components/lab/stages/stage-build"
import { StageRun } from "@/components/lab/stages/stage-run"
import { StageObserve } from "@/components/lab/stages/stage-observe"
import { StageExplain } from "@/components/lab/stages/stage-explain"
import { StageDebug } from "@/components/lab/stages/stage-debug"
import { StageChallenge } from "@/components/lab/stages/stage-challenge"
import { StageMaster } from "@/components/lab/stages/stage-master"
import { CodeEditorPanel } from "@/components/lab/CodeEditorPanel"
import { LabToolPanel } from "@/components/lab/LabToolPanel"
import { useSession } from "@/store/use-session"

const STAGE_COMPONENTS: Record<number, React.ComponentType> = {
  1: StageLearn,
  2: StagePredict,
  3: StageBuild,
  4: StageRun,
  5: StageObserve,
  6: StageExplain,
  7: StageDebug,
  8: StageChallenge,
  9: StageMaster,
}

function LabStageRouter() {
  const { stage, activeTab, connectedRunMode, goToStage, setActiveTab } = useLab()
  if (connectedRunMode && stage > 6) return <section role="status" className="mx-auto max-w-xl rounded-xl border border-border bg-card/60 p-6">
    <h2 className="text-lg font-semibold">Connected grading is not available yet</h2>
    <p className="mt-2 text-sm text-muted-foreground">Debug, Challenge, and Master still use local practice checks. Return to your saved Aer comparison and Lab Partner discussion.</p>
    <button type="button" onClick={() => { setActiveTab("circuit"); goToStage(5) }} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black">Review saved comparison</button>
  </section>
  if (activeTab === "code") return <CodeEditorPanel />
  if (connectedRunMode && activeTab !== "circuit") return <section role="status" className="mx-auto max-w-xl rounded-xl border border-border bg-card/60 p-6">
    <h2 className="text-lg font-semibold">Saved Aer visualization is in Observe</h2>
    <p className="mt-2 text-sm text-muted-foreground">This local preview does not represent a saved server run. Connected comparisons appear in Observe after an Aer run.</p>
    <button type="button" onClick={() => setActiveTab("circuit")} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black">Open circuit view</button>
  </section>
  if (activeTab === "histogram" || activeTab === "statevector" || activeTab === "bloch") return <LabToolPanel tab={activeTab} />
  const StageComponent = STAGE_COMPONENTS[stage] ?? StageLearn
  return <StageComponent />
}

export function LabShell({ algorithmSlug, initialStage = 1 }: { algorithmSlug: string; initialStage?: number }) {
  const accountMode = useSession((state) => state.mode)
  const learnerId = useSession((state) => state.user?.id ?? null)
  return (
    <LabProvider key={`${accountMode ?? "guest"}:${learnerId ?? "guest"}:${algorithmSlug}`} algorithmSlug={algorithmSlug} initialStage={initialStage}>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <TopBar />
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <LeftSidebar />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
            <LabStageRouter />
          </main>
          <RightSidebar />
        </div>
        <BottomBar />
      </div>
    </LabProvider>
  )
}
