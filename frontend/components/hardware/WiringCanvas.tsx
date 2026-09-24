"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { getComponent } from "@/lib/hardware/components"
import { LINES } from "@/lib/hardware/lines"
import type { LineTypeId, PlacedComponent } from "@/lib/hardware/types"
import { useHardware } from "@/store/use-hardware"

const BAND_HEIGHT = 156
const ICON_W = 128
const ICON_H = 56
const CANVAS_WIDTH = 1120
const PAD_X = 84

interface WiringCanvasProps {
  armedComponentId: string | null
  onPlaced: () => void
  activeLineType: LineTypeId
}

function iconCenter(p: PlacedComponent, stageIndex: number) {
  const cx = PAD_X + (p.position.x ?? 0.5) * (CANVAS_WIDTH - PAD_X * 2)
  const cy = stageIndex * BAND_HEIGHT + BAND_HEIGHT / 2 + (p.position.y ?? 0)
  return { cx, cy }
}

export function WiringCanvas({ armedComponentId, onPlaced, activeLineType }: WiringCanvasProps) {
  const design = useHardware((s) => s.design)
  const selectedPlacedId = useHardware((s) => s.selectedPlacedId)
  const selectedRouteId = useHardware((s) => s.selectedRouteId)
  const pendingRoute = useHardware((s) => s.pendingRoute)
  const pendingLineType = useHardware((s) => s.pendingLineType)
  const hiddenLines = useHardware((s) => s.hiddenLines)
  const select = useHardware((s) => s.select)
  const selectRoute = useHardware((s) => s.selectRoute)
  const placeComponent = useHardware((s) => s.placeComponent)
  const moveComponent = useHardware((s) => s.moveComponent)
  const beginRoute = useHardware((s) => s.beginRoute)
  const completeRoute = useHardware((s) => s.completeRoute)
  const cancelRoute = useHardware((s) => s.cancelRoute)

  const [dragId, setDragId] = useState<string | null>(null)
  const [hoverPort, setHoverPort] = useState<string | null>(null)
  const [wireCursor, setWireCursor] = useState<{ x: number; y: number } | null>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: CANVAS_WIDTH, h: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panRef = useRef({ clientX: 0, clientY: 0, viewX: 0, viewY: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const stageIndexById = useMemo(() => {
    const m = new Map<string, number>()
    design.stages.forEach((s, i) => m.set(s.id, i))
    return m
  }, [design.stages])

  const height = Math.max(design.stages.length * BAND_HEIGHT, BAND_HEIGHT)

  useEffect(() => {
    setViewBox((current) => ({ ...current, h: height, y: Math.min(current.y, Math.max(0, height - current.h)) }))
  }, [height])

  function toSvgPoint(evt: { clientX: number; clientY: number }) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: viewBox.x + ((evt.clientX - rect.left) / rect.width) * viewBox.w,
      y: viewBox.y + ((evt.clientY - rect.top) / rect.height) * viewBox.h,
    }
  }

  function zoomAt(clientX: number, clientY: number, factor: number) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const anchorX = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w
    const anchorY = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h
    const nextW = Math.min(CANVAS_WIDTH, Math.max(360, viewBox.w * factor))
    const nextH = Math.min(height, Math.max(220, viewBox.h * factor))
    setViewBox({
      w: nextW,
      h: nextH,
      x: Math.max(0, Math.min(CANVAS_WIDTH - nextW, anchorX - ((clientX - rect.left) / rect.width) * nextW)),
      y: Math.max(0, Math.min(height - nextH, anchorY - ((clientY - rect.top) / rect.height) * nextH)),
    })
  }

  function getPortPoint(placedId: string, portId: string) {
    const p = design.placed.find((pp) => pp.id === placedId)
    if (!p) return null
    const def = getComponent(p.componentId)
    if (!def) return null
    const idx = stageIndexById.get(p.stageId) ?? 0
    const { cx, cy } = iconCenter(p, idx)
    const portCount = def.ports.length
    const pi = def.ports.findIndex((port) => port.id === portId)
    if (pi === -1) return null
    return { x: cx - ICON_W / 2 + ((pi + 1) / (portCount + 1)) * ICON_W, y: cy + ICON_H / 2 }
  }

  function handleBandClick(stageId: string, evt: React.MouseEvent<SVGSVGElement>) {
    if (pendingRoute) {
      cancelRoute()
      return
    }
    if (!armedComponentId) {
      select(null)
      selectRoute(null)
      return
    }
    const { x, y } = toSvgPoint(evt)
    const idx = stageIndexById.get(stageId) ?? 0
    const fracX = Math.min(1, Math.max(0, (x - PAD_X) / (CANVAS_WIDTH - PAD_X * 2)))
    const localY = Math.min(BAND_HEIGHT / 2 - ICON_H, Math.max(-(BAND_HEIGHT / 2 - ICON_H), y - (idx * BAND_HEIGHT + BAND_HEIGHT / 2)))
    placeComponent(armedComponentId, stageId, { x: fracX, y: localY })
    onPlaced()
  }

  function handlePortMouseDown(placedId: string, portId: string, evt: React.MouseEvent) {
    evt.stopPropagation()
    if (!pendingRoute) {
      beginRoute(placedId, portId, activeLineType)
    }
  }

  // Drag-to-connect: while a route is pending, track the cursor for a live preview
  // line and resolve whatever port (if any) the mouse is released over.
  useEffect(() => {
    if (!pendingRoute) {
      setWireCursor(null)
      return
    }
    let moved = false
    let startX = 0
    let startY = 0
    let started = false

    function onMove(e: MouseEvent) {
      if (!started) {
        startX = e.clientX
        startY = e.clientY
        started = true
      }
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 4) moved = true
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      setWireCursor({
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
        y: ((e.clientY - rect.top) / rect.height) * height,
      })
    }

    function onUp(e: MouseEvent) {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const portEl = el?.closest("[data-port-owner]")
      if (portEl) {
        const owner = portEl.getAttribute("data-port-owner")
        const portId = portEl.getAttribute("data-port-id")
        if (owner && portId) completeRoute(owner, portId)
        return
      }
      if (moved) cancelRoute()
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [pendingRoute, completeRoute, cancelRoute, height])

  return (
    <div
      className={cn("relative h-full w-full select-none overflow-hidden rounded-xl border border-white/10 bg-black/30", isPanning ? "cursor-grabbing" : "cursor-grab")}
      style={{ WebkitUserSelect: "none", userSelect: "none", touchAction: "none" }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-hardware-component")) event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        const componentId = event.dataTransfer.getData("application/x-hardware-component")
        if (!componentId) return
        const point = toSvgPoint(event)
        const idx = Math.max(0, Math.min(design.stages.length - 1, Math.floor(point.y / BAND_HEIGHT)))
        const stage = design.stages[idx]
        if (!stage) return
        const fracX = Math.min(1, Math.max(0, (point.x - PAD_X) / (CANVAS_WIDTH - PAD_X * 2)))
        const localY = Math.min(BAND_HEIGHT / 2 - ICON_H, Math.max(-(BAND_HEIGHT / 2 - ICON_H), point.y - (idx * BAND_HEIGHT + BAND_HEIGHT / 2)))
        placeComponent(componentId, stage.id, { x: fracX, y: localY })
        onPlaced()
      }}
      onWheel={(event) => {
        event.preventDefault()
        zoomAt(event.clientX, event.clientY, event.deltaY > 0 ? 1.1 : 0.9)
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const target = event.target as Element
        if (target.closest("[data-port-owner], [data-component-node]")) return
        setIsPanning(true)
        panRef.current = { clientX: event.clientX, clientY: event.clientY, viewX: viewBox.x, viewY: viewBox.y }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!isPanning) return
        const rect = svgRef.current?.getBoundingClientRect()
        if (!rect) return
        setViewBox((current) => ({
          ...current,
          x: Math.max(0, Math.min(CANVAS_WIDTH - current.w, panRef.current.viewX - ((event.clientX - panRef.current.clientX) / rect.width) * current.w)),
          y: Math.max(0, Math.min(height - current.h, panRef.current.viewY - ((event.clientY - panRef.current.clientY) / rect.height) * current.h)),
        }))
      }}
      onPointerUp={() => setIsPanning(false)}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h || height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full select-none"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            select(null)
            selectRoute(null)
            if (pendingRoute) cancelRoute()
          }
        }}
      >
        {design.stages.map((stage, idx) => (
          <g key={stage.id}>
            <rect
              x={0}
              y={idx * BAND_HEIGHT}
              width={CANVAS_WIDTH}
              height={BAND_HEIGHT}
              fill={stage.color}
              opacity={idx % 2 === 0 ? 0.06 : 0.1}
              onClick={(e) => handleBandClick(stage.id, e as unknown as React.MouseEvent<SVGSVGElement>)}
            />
            <line x1={0} y1={idx * BAND_HEIGHT} x2={CANVAS_WIDTH} y2={idx * BAND_HEIGHT} stroke={stage.color} strokeOpacity={0.35} strokeWidth={1} />
            <text x={24} y={idx * BAND_HEIGHT + 30} fill={stage.color} fontSize={22} fontWeight={700}>
              {stage.label}
            </text>
            <text x={24} y={idx * BAND_HEIGHT + 53} fill="white" fillOpacity={0.55} fontSize={17}>
              {stage.temperatureLabel}
              {stage.coolingPowerW !== undefined ? ` · ~${stage.coolingPowerW}W` : ""}
            </text>
          </g>
        ))}

        {armedComponentId && (
          <rect x={0} y={0} width={CANVAS_WIDTH} height={height} fill="white" opacity={0.02} className="pointer-events-none" />
        )}

        {/* click-catcher rects per band, on top so click coordinates are accurate even with icons present */}
        {design.stages.map((stage, idx) => (
          <rect
            key={`hit-${stage.id}`}
            x={0}
            y={idx * BAND_HEIGHT}
            width={CANVAS_WIDTH}
            height={BAND_HEIGHT}
            fill="transparent"
            style={{ cursor: armedComponentId ? "copy" : "default" }}
            onClick={(e) => handleBandClick(stage.id, e as unknown as React.MouseEvent<SVGSVGElement>)}
          />
        ))}

        {/* Routes */}
        {design.routes
          .filter((r) => !hiddenLines.includes(r.lineType))
          .map((route) => {
            const fromP = design.placed.find((p) => p.id === route.fromPlacedId)
            const toP = design.placed.find((p) => p.id === route.toPlacedId)
            if (!fromP || !toP) return null
            const fromIdx = stageIndexById.get(fromP.stageId) ?? 0
            const toIdx = stageIndexById.get(toP.stageId) ?? 0
            const from = iconCenter(fromP, fromIdx)
            const to = iconCenter(toP, toIdx)
            const line = LINES[route.lineType]
            const midY = (from.cy + to.cy) / 2
            const path = `M ${from.cx} ${from.cy} C ${from.cx} ${midY}, ${to.cx} ${midY}, ${to.cx} ${to.cy}`
            const isSelected = selectedRouteId === route.id
            return (
              <g key={route.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={line?.color ?? "#888"}
                  strokeWidth={isSelected ? 3.5 : 2}
                  strokeOpacity={isSelected ? 1 : 0.65}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    selectRoute(route.id)
                  }}
                />
                <circle cx={(from.cx + to.cx) / 2} cy={midY} r={3} fill={line?.color ?? "#888"} />
              </g>
            )
          })}

        {/* Placed components */}
        {design.placed.map((p) => {
          const def = getComponent(p.componentId)
          if (!def) return null
          const idx = stageIndexById.get(p.stageId) ?? 0
          const { cx, cy } = iconCenter(p, idx)
          const isSelected = selectedPlacedId === p.id
          const portCount = def.ports.length
          return (
            <g
              key={p.id}
              data-component-node
              className="cursor-move"
              onMouseDown={() => setDragId(p.id)}
              onMouseMove={(e) => {
                if (dragId !== p.id) return
                const { x, y } = toSvgPoint(e as unknown as React.MouseEvent<SVGSVGElement>)
                const fracX = Math.min(1, Math.max(0, (x - PAD_X) / (CANVAS_WIDTH - PAD_X * 2)))
                const localY = Math.min(BAND_HEIGHT / 2 - ICON_H, Math.max(-(BAND_HEIGHT / 2 - ICON_H), y - (idx * BAND_HEIGHT + BAND_HEIGHT / 2)))
                moveComponent(p.id, { x: fracX, y: localY })
              }}
              onMouseUp={() => setDragId(null)}
              onClick={(e) => {
                e.stopPropagation()
                select(p.id)
              }}
            >
              <rect
                x={cx - ICON_W / 2}
                y={cy - ICON_H / 2}
                width={ICON_W}
                height={ICON_H}
                rx={8}
                fill="#0a0a0f"
                stroke={isSelected ? "#f97316" : "rgba(255,255,255,0.25)"}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text x={cx} y={cy - 3} textAnchor="middle" fill="white" fontSize={15} fontWeight={700} style={{ userSelect: "none" }}>
                {def.abbreviation}
              </text>
              <text x={cx} y={cy + 18} textAnchor="middle" fill="white" fillOpacity={0.55} fontSize={11} style={{ userSelect: "none" }}>
                {def.category}
              </text>
              {def.ports.map((port, pi) => {
                const px = cx - ICON_W / 2 + ((pi + 1) / (portCount + 1)) * ICON_W
                const py = cy + ICON_H / 2
                const isPending = pendingRoute?.placedId === p.id && pendingRoute.port === port.id
                const isHovered = hoverPort === `${p.id}:${port.id}`
                return (
                  <g key={port.id}>
                    <circle
                      cx={px}
                      cy={py}
                      r={9}
                      fill="transparent"
                      data-port-owner={p.id}
                      data-port-id={port.id}
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoverPort(`${p.id}:${port.id}`)}
                      onMouseLeave={() => setHoverPort(null)}
                      onMouseDown={(e) => handlePortMouseDown(p.id, port.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <circle
                      cx={px}
                      cy={py}
                      r={isPending || isHovered ? 8 : 6}
                      fill={isPending ? "#f97316" : "#94a3b8"}
                      stroke="#0a0a0f"
                      strokeWidth={1}
                      className="pointer-events-none"
                    />
                  </g>
                )
              })}
            </g>
          )
        })}

        {pendingRoute && wireCursor && (() => {
          const origin = getPortPoint(pendingRoute.placedId, pendingRoute.port)
          if (!origin) return null
          const midY = (origin.y + wireCursor.y) / 2
          const path = `M ${origin.x} ${origin.y} C ${origin.x} ${midY}, ${wireCursor.x} ${midY}, ${wireCursor.x} ${wireCursor.y}`
          const line = LINES[pendingLineType]
          return (
            <path
              d={path}
              fill="none"
              stroke={line?.color ?? "#f97316"}
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeOpacity={0.85}
              className="pointer-events-none"
            />
          )
        })()}
      </svg>

      {armedComponentId && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-200">
          Click a stage band to place the armed component
        </div>
      )}
      {pendingRoute && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200">
          Drag to another port to complete the route, or release on empty space to cancel
        </div>
      )}
      {!pendingRoute && !armedComponentId && design.placed.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-white/10 bg-black/40 px-4 py-2 text-sm font-medium text-white/60">
          Drag from a port to another port to add a wire
        </div>
      )}
    </div>
  )
}
