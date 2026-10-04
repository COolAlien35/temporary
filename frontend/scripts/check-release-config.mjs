// Render opts into connected release validation; local demo builds stay available.
if (process.env.REQUIRE_CONNECTED_CONFIG === "true" || process.env.REQUIRE_CONNECTED_CONFIG === "1") {
  const keys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_QUANTUMLOOP_API_URL"]
  for (const key of keys) {
    const value = process.env[key]
    if (!value || /YOUR_|PLACEHOLDER/i.test(value)) throw new Error(`Configure ${key} before building a connected release`)
  }
  for (const key of [keys[0], keys[2]]) {
    const url = new URL(process.env[key])
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error(`${key} must be an HTTPS origin`)
  }
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (key.startsWith("sb_secret_")) throw new Error("A Supabase secret key must never be bundled into the browser")
  if (key.split(".").length === 3) {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
    if (payload.role !== "anon") throw new Error("Only an anonymous/publishable Supabase key can be bundled")
  } else if (!key.startsWith("sb_publishable_")) throw new Error("Use a Supabase publishable key")
}
