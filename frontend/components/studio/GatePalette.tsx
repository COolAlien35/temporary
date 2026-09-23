"use client"

import { useMemo, useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { Search } from "lucide-react"
import { GATE_DEFS, GATE_GROUPS } from "@/lib/studio/gates"
import type { StudioGateType } from "@/lib/studio/types"
import { cn } from "@/lib/utils"

function PaletteChip({ type }: { type: StudioGateType }) {
  const def = GATE_DEFS[type]
  const [hover, setHover] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette-${type}`, data: { source: "palette", gateType: type } })

  return (
    <div className="relative">
      <button
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        type="button"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-opacity",
          def.color,
          isDragging && "opacity-40",
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/20 font-mono text-[11px]">{def.symbol}</span>
        <span className="truncate">{def.label}</span>
      </button>
      {hover && !isDragging && (
        <div role="tooltip" className="pointer-events-none absolute left-full top-0 z-30 ml-2 w-56 rounded-lg border border-white/10 bg-[#0D1220] p-3 text-xs shadow-xl">
          <p className="font-semibold text-white">{def.label}</p>
          <p className="mt-1 text-white/60">{def.description}</p>
          {def.matrix && <p className="mt-2 font-mono text-[11px] text-[#00D4FF]">{def.matrix}</p>}
        </div>
      )}
    </div>
  )
}

export function GatePalette() {
  const [query, setQuery] = useState("")

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return GATE_GROUPS
    return GATE_GROUPS.map((group) => ({ ...group, gates: group.gates.filter((g) => GATE_DEFS[g].label.toLowerCase().includes(q) || g.toLowerCase().includes(q)) })).filter((group) => group.gates.length > 0)
  }, [query])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search gates..."
          className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/35 focus:border-[#00D4FF]/50 focus:outline-none"
        />
      </div>
      {filteredGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{group.label}</p>
          <div className="flex flex-col gap-1.5">
            {group.gates.map((type) => (
              <PaletteChip key={type} type={type} />
            ))}
          </div>
        </div>
      ))}
      {filteredGroups.length === 0 && <p className="text-xs text-white/40">No gates match &ldquo;{query}&rdquo;.</p>}
    </div>
  )
}
