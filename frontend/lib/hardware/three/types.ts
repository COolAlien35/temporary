// Shared types for the procedural 3D component models.
// Units: mm. Origin at the model's bounding-box center. +Y is up (local model space,
// before PlacedComponents lays it flat on a stage plate).

export interface PortAnchor3D {
  /** Matches HardwareComponent.ports[].id */
  id: string
  /** Local-space position, mm, relative to the model's bbox center */
  position: [number, number, number]
  /** Outward direction the port/cable leaves the model, unit vector */
  direction: [number, number, number]
}

export interface ModelDefinition {
  ports: PortAnchor3D[]
  /** Max triangle budget hint, informational only */
  triangleBudget?: number
}
