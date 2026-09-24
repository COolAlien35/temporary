import { nanoid } from "nanoid"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getComponent } from "@/lib/hardware/components"
import { createCustomStage, nextAllowedStages, STAGE_LIST } from "@/lib/hardware/stages"
import { emptyDesign } from "@/lib/hardware/generator"
import type { Design, LineTypeId, PlacedComponent, Route, SavedDesign, Stage, ThermalResult, Issue } from "@/lib/hardware/types"
import { validateDesign } from "@/lib/hardware/validate"
import { computeThermal } from "@/lib/hardware/thermal"

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
  pendingLineType: LineTypeId
  hiddenLines: LineTypeId[]
  view: "diagram" | "list"
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
  setView: (v: "diagram" | "list") => void

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
      pendingLineType: "xy",
      hiddenLines: [],
      view: "diagram",
      issues: [],
      thermal: null,
      tourCompleted: false,

      newDesign: (qubits, name) => {
        const d = emptyDesign(name ?? "Untitled design")
        d.meta.qubits = qubits
        set({ design: d, selectedPlacedId: null, selectedRouteId: null, pendingRoute: null, issues: [], thermal: null })
      },

      loadDesign: (design) => set({ design: touch(design), selectedPlacedId: null, selectedRouteId: null, pendingRoute: null, issues: [], thermal: null }),

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
          return { design: touch({ ...s.design, stages: [...s.design.stages, next] }) }
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
          }
        }),

      placeComponent: (componentId, stageId, position) => {
        const placedId = nanoid(8)
        set((s) => {
          const entry: PlacedComponent = { id: placedId, componentId, stageId, position, rotationDeg: 0 }
          return { design: touch({ ...s.design, placed: [...s.design.placed, entry] }), selectedPlacedId: placedId }
        })
        return placedId
      },

      moveComponent: (placedId, position) =>
        set((s) => ({ design: touch({ ...s.design, placed: s.design.placed.map((p) => (p.id === placedId ? { ...p, position } : p)) }) })),

      removeComponent: (placedId) =>
        set((s) => ({
          design: touch({
            ...s.design,
            placed: s.design.placed.filter((p) => p.id !== placedId),
            routes: s.design.routes.filter((r) => r.fromPlacedId !== placedId && r.toPlacedId !== placedId),
          }),
          selectedPlacedId: s.selectedPlacedId === placedId ? null : s.selectedPlacedId,
        })),

      beginRoute: (placedId, port, lineType) => set({ pendingRoute: { placedId, port }, pendingLineType: lineType }),
      cancelRoute: () => set({ pendingRoute: null }),

      completeRoute: (placedId, port) =>
        set((s) => {
          if (!s.pendingRoute) return s
          if (s.pendingRoute.placedId === placedId) return { pendingRoute: null }
          const fromPlaced = s.design.placed.find((p) => p.id === s.pendingRoute!.placedId)
          const fromDef = fromPlaced ? getComponent(fromPlaced.componentId) : undefined
          const fromPort = fromDef?.ports.find((p) => p.id === s.pendingRoute!.port)
          const cableFamilyId = fromDef ? "ss-coax" : "ss-coax"
          const route: Route = {
            id: nanoid(8),
            lineType: s.pendingLineType,
            fromPlacedId: s.pendingRoute.placedId,
            fromPort: s.pendingRoute.port,
            toPlacedId: placedId,
            toPort: port,
            waypoints: [],
            cableFamilyId: (cableFamilyId as Route["cableFamilyId"]) ?? "ss-coax",
            attenuationDb: 0,
          }
          void fromPort
          return { design: touch({ ...s.design, routes: [...s.design.routes, route] }), pendingRoute: null, selectedRouteId: route.id }
        }),

      removeRoute: (routeId) =>
        set((s) => ({
          design: touch({ ...s.design, routes: s.design.routes.filter((r) => r.id !== routeId) }),
          selectedRouteId: s.selectedRouteId === routeId ? null : s.selectedRouteId,
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
