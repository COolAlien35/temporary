import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"

const good = {
  REQUIRE_CONNECTED_CONFIG: "true",
  NEXT_PUBLIC_SUPABASE_URL: "https://release.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  NEXT_PUBLIC_QUANTUMLOOP_API_URL: "https://api.example.test",
}
const check = (overrides) => spawnSync(process.execPath, ["scripts/check-release-config.mjs"], {
  env: { ...process.env, ...good, ...overrides }, encoding: "utf8",
})
test("connected release requires configured HTTPS origins and a public key", () => {
  assert.equal(check({}).status, 0)
  for (const overrides of [
    { NEXT_PUBLIC_QUANTUMLOOP_API_URL: "" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://YOUR_PROJECT.supabase.co" },
    { NEXT_PUBLIC_QUANTUMLOOP_API_URL: "http://localhost:8000" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_example" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `x.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.x` },
  ]) assert.notEqual(check(overrides).status, 0)
  assert.equal(check({ REQUIRE_CONNECTED_CONFIG: "false", NEXT_PUBLIC_SUPABASE_URL: "" }).status, 0)
})
