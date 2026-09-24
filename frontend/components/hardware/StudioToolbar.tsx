"use client"

import { useState } from "react"
import { FolderOpen, Layers, List, Plus, Redo2, Save, Sparkles, Trash2, Workflow } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LINE_LIST } from "@/lib/hardware/lines"
import { PRESETS } from "@/lib/hardware/presets"
import { useHardware } from "@/store/use-hardware"

export function StudioToolbar() {
  const design = useHardware((s) => s.design)
  const savedDesigns = useHardware((s) => s.savedDesigns)
  const view = useHardware((s) => s.view)
  const hiddenLines = useHardware((s) => s.hiddenLines)
  const newDesign = useHardware((s) => s.newDesign)
  const saveDesign = useHardware((s) => s.saveDesign)
  const loadSaved = useHardware((s) => s.loadSaved)
  const deleteSaved = useHardware((s) => s.deleteSaved)
  const loadDesign = useHardware((s) => s.loadDesign)
  const addStage = useHardware((s) => s.addStage)
  const removeStage = useHardware((s) => s.removeStage)
  const setView = useHardware((s) => s.setView)
  const toggleLineVisibility = useHardware((s) => s.toggleLineVisibility)

  const [nameDraft, setNameDraft] = useState(design.meta.name)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
      <input
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => saveDesign(nameDraft || "Untitled design")}
        className="w-40 shrink-0 rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs font-medium text-white focus:border-[#00D4FF]/40 focus:outline-none sm:w-52"
        aria-label="Design name"
      />

      <button
        onClick={() => saveDesign(nameDraft || "Untitled design")}
        className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:border-white/20 hover:text-white"
      >
        <Save className="h-3.5 w-3.5" /> Save
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:border-white/20 hover:text-white" />
          }
        >
          <FolderOpen className="h-3.5 w-3.5" /> Load
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 border-white/10 bg-[#10141F] text-white">
          <DropdownMenuLabel className="text-white/50">Saved designs</DropdownMenuLabel>
          {savedDesigns.length === 0 && <p className="px-2 py-1.5 text-xs text-white/40">Nothing saved yet</p>}
          {savedDesigns.map((sd) => (
            <DropdownMenuItem key={sd.id} className="flex items-center justify-between gap-2 focus:bg-white/10 focus:text-white">
              <button onClick={() => loadSaved(sd.id)} className="flex-1 truncate text-left">
                {sd.design.meta.name}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSaved(sd.id)
                }}
                aria-label={`Delete ${sd.design.meta.name}`}
                className="text-white/30 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuLabel className="text-white/50">Presets</DropdownMenuLabel>
          {PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.slug}
              onClick={() => {
                loadDesign(preset.design)
                setNameDraft(preset.design.meta.name)
              }}
              className="focus:bg-white/10 focus:text-white"
            >
              <Sparkles className="mr-2 h-3 w-3 text-[#00D4FF]" /> {preset.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={() => {
          newDesign(1, "Untitled design")
          setNameDraft("Untitled design")
        }}
        className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:border-white/20 hover:text-white"
      >
        <Redo2 className="h-3.5 w-3.5" /> New
      </button>

      <div className="mx-1 h-5 w-px bg-white/10" />

      <button
        onClick={addStage}
        className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:border-white/20 hover:text-white"
      >
        <Plus className="h-3.5 w-3.5" /> Stage
      </button>
      <button
        onClick={() => {
          const last = design.stages[design.stages.length - 1]
          if (last) removeStage(last.id)
        }}
        disabled={design.stages.length <= 2}
        className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Layers className="h-3.5 w-3.5" /> Remove stage
      </button>

      <div className="mx-1 h-5 w-px bg-white/10" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:border-white/20 hover:text-white" />
          }
        >
          <Workflow className="h-3.5 w-3.5" /> Lines
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 border-white/10 bg-[#10141F] text-white">
          {LINE_LIST.map((line) => (
            <DropdownMenuItem
              key={line.id}
              onClick={(e) => {
                e.preventDefault()
                toggleLineVisibility(line.id)
              }}
              className="flex items-center gap-2 focus:bg-white/10 focus:text-white"
            >
              <span
                className={cn("h-2.5 w-2.5 shrink-0 rounded-full", hiddenLines.includes(line.id) && "opacity-20")}
                style={{ backgroundColor: line.color }}
              />
              <span className={cn(hiddenLines.includes(line.id) && "text-white/30 line-through")}>{line.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-1 rounded-md border border-white/10 p-0.5">
        <button
          onClick={() => setView("diagram")}
          aria-label="Diagram view"
          className={cn("rounded px-2 py-1", view === "diagram" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}
        >
          <Workflow className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setView("list")}
          aria-label="List view"
          className={cn("rounded px-2 py-1", view === "list" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
