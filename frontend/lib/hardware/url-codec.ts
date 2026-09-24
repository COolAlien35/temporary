import type { Design } from "./types"

/**
 * Simple base64url JSON codec for sharing a design via URL hash.
 * Not compressed — fine for designs up to a few dozen components/routes,
 * which covers everything the builder produces.
 */
export function encodeDesign(design: Design): string {
  const json = JSON.stringify(design)
  const base64 = typeof window === "undefined" ? Buffer.from(json, "utf-8").toString("base64") : btoa(unescape(encodeURIComponent(json)))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function decodeDesign(encoded: string): Design | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const json = typeof window === "undefined" ? Buffer.from(padded, "base64").toString("utf-8") : decodeURIComponent(escape(atob(padded)))
    const parsed = JSON.parse(json)
    if (!parsed?.meta || !Array.isArray(parsed.stages) || !Array.isArray(parsed.placed) || !Array.isArray(parsed.routes)) return null
    return parsed as Design
  } catch {
    return null
  }
}
