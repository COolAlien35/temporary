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
  const { stage } = useLab()
  const StageComponent = STAGE_COMPONENTS[stage] ?? StageLearn
  return <StageComponent />
}

export function LabShell({ algorithmSlug, initialStage = 1 }: { algorithmSlug: string; initialStage?: number }) {
  return (
    <LabProvider algorithmSlug={algorithmSlug} initialStage={initialStage}>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <TopBar />
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <LeftSidebar />
          <main className="flex-1 overflow-y-auto px-6 py-6">
            <LabStageRouter />
          </main>
          <RightSidebar />
        </div>
        <BottomBar />
      </div>
    </LabProvider>
  )
}
