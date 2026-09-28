import { nanoid } from "nanoid"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getComponent } from "@/lib/hardware/components"
import { createCustomStage, nextAllowedStages, STAGE_LIST } from "@/lib/hardware/stages"
import { emptyDesign } from "@/lib/hardware/generator"
import type { Design, LineTypeId, PlacedComponent, Route, SavedDesign, Stage, ThermalResult, Issue } from "@/lib/hardware/types"
import { validateDesign } from "@/lib/hardware/validate"
import { computeThermal } from "@/lib/hardware/thermal"
import { LINES } from "@/lib/hardware/lines"

interface PendingRoute {
  placedId: string
  port: string
}

interface HardwareState {
  design: Design
  savedDesigns: SavedDesign[]
  favorites: string[]
  bookmarks: string[]
  selectedPlacedId: string | null
  selectedRouteId: string | null
  pendingRoute: PendingRoute | null
  routeError: string | null
  pendingLineType: LineTypeId
  hiddenLines: LineTypeId[]
  view: "diagram" | "3d" | "list"
  issues: Issue[]
  thermal: ThermalResult | null
  tourCompleted: boolean

  newDesign: (qubits: number, name?: string) => void
  loadDesign: (design: Design) => void
  saveDesign: (nameOverride?: string) => void
  deleteSaved: (id: string) => void
  loadSaved: (id: string) => void

  addStage: () => void
  removeStage: (stageId: string) => void

  placeComponent: (componentId: string, stageId: string, position: { x: number; y: number }) => string
  moveComponent: (placedId: string, position: { x: number; y: number }) => void
  removeComponent: (placedId: string) => void

  beginRoute: (placedId: string, port: string, lineType: LineTypeId) => void
  cancelRoute: () => void
  completeRoute: (placedId: string, port: string) => void
  removeRoute: (routeId: string) => void

  select: (placedId: string | null) => void
  selectRoute: (routeId: string | null) => void
  toggleLineVisibility: (lineType: LineTypeId) => void
  setView: (v: "diagram" | "3d" | "list") => void

  toggleFavorite: (componentId: string) => void
  toggleBookmark: (id: string) => void

  runValidation: () => void
  runThermal: () => void
  completeTour: () => void
}

function touch(design: Design): Design {
  return { ...design, meta: { ...design.meta, updatedAt: Date.now() } }
}

export const useHardware = create<HardwareState>()(
  persist(
    (set, get) => ({
      design: emptyDesign(),
      savedDesigns: [],
      favorites: [],
      bookmarks: [],
      selectedPlacedId: null,
      selectedRouteId: null,
      pendingRoute: null,
      routeError: null,
      pendingLineType: "xy",
      hiddenLines: [],
      view: "diagram",
      issues: [],
      thermal: null,
      tourCompleted: false,

      newDesign: (qubits, name) => {
        const d = emptyDesign(name ?? "Untitled design")
        d.meta.qubits = qubits
        set({ design: d, selectedPlacedId: null, selectedRouteId: null, pendingRoute: null, routeError: null, issues: [], thermal: null })
      },

      loadDesign: (design) => set({ design: touch(design), selectedPlacedId: null, selectedRouteId: null, pendingRoute: null, routeError: null, issues: [], thermal: null }),

      saveDesign: (nameOverride) =>
        set((s) => {
          const design = nameOverride ? { ...s.design, meta: { ...s.design.meta, name: nameOverride } } : s.design
          const existing = s.savedDesigns.find((sd) => sd.design.meta.name === design.meta.name)
          const entry: SavedDesign = { id: existing?.id ?? nanoid(8), design: touch(design) }
          return { design: entry.design, savedDesigns: [entry, ...s.savedDesigns.filter((sd) => sd.id !== entry.id)] }
        }),

      deleteSaved: (id) => set((s) => ({ savedDesigns: s.savedDesigns.filter((sd) => sd.id !== id) })),

      loadSaved: (id) => {
        const found = get().savedDesigns.find((sd) => sd.id === id)
        if (found) get().loadDesign(found.design)
      },

      addStage: () =>
        set((s) => {
          const candidates = nextAllowedStages(s.design.stages)
          if (candidates.length === 0) return s
          const next: Stage = candidates[0].custom ? candidates[0] : candidates[0]
          return { design: touch({ ...s.design, stages: [...s.design.stages, next] }), issues: [], thermal: null }
        }),

      removeStage: (stageId) =>
        set((s) => {
          const placedOnStage = new Set(s.design.placed.filter((p) => p.stageId === stageId).map((p) => p.id))
          return {
            design: touch({
              ...s.design,
              stages: s.design.stages.filter((st) => st.id !== stageId),
              placed: s.design.placed.filter((p) => p.stageId !== stageId),
              routes: s.design.routes.filter((r) => !placedOnStage.has(r.fromPlacedId) && !placedOnStage.has(r.toPlacedId)),
            }),
            selectedPlacedId: placedOnStage.has(s.selectedPlacedId ?? "") ? null : s.selectedPlacedId,
            selectedRouteId: null,
            pendingRoute: null,
            routeError: null,
            issues: [],
            thermal: null,
          }
        }),

      placeComponent: (componentId, stageId, position) => {
        const placedId = nanoid(8)
        set((s) => {
          const entry: PlacedComponent = { id: placedId, componentId, stageId, position, rotationDeg: 0 }
          return { design: touch({ ...s.design, placed: [...s.design.placed, entry] }), selectedPlacedId: placedId, selectedRouteId: null, issues: [], thermal: null }
        })
        return placedId
      },

      moveComponent: (placedId, position) =>
        set((s) => ({ design: touch({ ...s.design, placed: s.design.placed.map((p) => (p.id === placedId ? { ...p, position } : p)) }), issues: [], thermal: null })),

      removeComponent: (placedId) =>
        set((s) => ({
          design: touch({
            ...s.design,
            placed: s.design.placed.filter((p) => p.id !== placedId),
            routes: s.design.routes.filter((r) => r.fromPlacedId !== placedId && r.toPlacedId !== placedId),
          }),
          selectedPlacedId: s.selectedPlacedId === placedId ? null : s.selectedPlacedId,
          selectedRouteId: null,
          pendingRoute: null,
          routeError: null,
          issues: [],
          thermal: null,
        })),

      beginRoute: (placedId, port, lineType) => set({ pendingRoute: { placedId, port }, pendingLineType: lineType, routeError: null }),
      cancelRoute: () => set({ pendingRoute: null, routeError: null }),

      completeRoute: (placedId, port) =>
        set((s) => {
          if (!s.pendingRoute) return s
          if (s.pendingRoute.placedId === placedId) return { pendingRoute: null, routeError: "Connect to a port on another component." }
          const fromPlaced = s.design.placed.find((p) => p.id === s.pendingRoute!.placedId)
          const toPlaced = s.design.placed.find((p) => p.id === placedId)
          const fromDef = fromPlaced ? getComponent(fromPlaced.componentId) : undefined
          const toDef = toPlaced ? getComponent(toPlaced.componentId) : undefined
          const fromPort = fromDef?.ports.find((p) => p.id === s.pendingRoute!.port)
          const toPort = toDef?.ports.find((p) => p.id === port)
          if (!fromPort || !toPort) return { pendingRoute: null, routeError: "One of those ports is no longer available." }
          const portInUse = (placedId: string, portId: string) => s.design.routes.some((route) =>
            (route.fromPlacedId === placedId && route.fromPort === portId) ||
            (route.toPlacedId === placedId && route.toPort === portId),
          )
          if ((!fromPort.allowMultipleConnections && portInUse(s.pendingRoute.placedId, fromPort.id)) ||
              (!toPort.allowMultipleConnections && portInUse(placedId, toPort.id))) {
            return { pendingRoute: null, routeError: "That port already has a wire. Choose a free port or remove the existing wire first." }
          }
          if (s.design.routes.some((r) => r.fromPlacedId === fromPlaced?.id && r.fromPort === fromPort.id && r.toPlacedId === placedId && r.toPort === port && r.lineType === s.pendingLineType)) return { pendingRoute: null, routeError: "These ports are already connected by this signal." }
          const route: Route = {
            id: nanoid(8),
            lineType: s.pendingLineType,
            fromPlacedId: s.pendingRoute.placedId,
            fromPort: s.pendingRoute.port,
            toPlacedId: placedId,
            toPort: port,
            waypoints: [],
            cableFamilyId: LINES[s.pendingLineType].cableFamilyId as Route["cableFamilyId"],
            attenuationDb: 0,
          }
          return { design: touch({ ...s.design, routes: [...s.design.routes, route] }), pendingRoute: null, routeError: null, selectedPlacedId: null, selectedRouteId: route.id, issues: [], thermal: null }
        }),

      removeRoute: (routeId) =>
        set((s) => ({
          design: touch({ ...s.design, routes: s.design.routes.filter((r) => r.id !== routeId) }),
          selectedRouteId: s.selectedRouteId === routeId ? null : s.selectedRouteId,
          routeError: null,
          issues: [],
          thermal: null,
        })),

      select: (placedId) => set({ selectedPlacedId: placedId, selectedRouteId: null }),
      selectRoute: (routeId) => set({ selectedRouteId: routeId, selectedPlacedId: null }),
      toggleLineVisibility: (lineType) =>
        set((s) => ({ hiddenLines: s.hiddenLines.includes(lineType) ? s.hiddenLines.filter((l) => l !== lineType) : [...s.hiddenLines, lineType] })),
      setView: (v) => set({ view: v }),

      toggleFavorite: (componentId) =>
        set((s) => ({ favorites: s.favorites.includes(componentId) ? s.favorites.filter((f) => f !== componentId) : [...s.favorites, componentId] })),
      toggleBookmark: (bid) => set((s) => ({ bookmarks: s.bookmarks.includes(bid) ? s.bookmarks.filter((b) => b !== bid) : [...s.bookmarks, bid] })),

      runValidation: () => set((s) => ({ issues: validateDesign(s.design) })),
      runThermal: () => set((s) => ({ thermal: computeThermal(s.design) })),
      completeTour: () => set({ tourCompleted: true }),
    }),
    {
      name: "hardware:design-v1",
      skipHydration: true,
      partialize: (s) => ({
        design: s.design,
        savedDesigns: s.savedDesigns,
        favorites: s.favorites,
        bookmarks: s.bookmarks,
        view: s.view,
        tourCompleted: s.tourCompleted,
      }),
    },
  ),
)

export { STAGE_LIST }
