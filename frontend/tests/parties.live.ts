import { expect, test, type Page } from "@playwright/test"

type Identity = { subject: string; email: string; token: string }

async function login(page: Page, index: number, identities: Identity[]) {
    const identity = identities[index]
    const user = { id: identity.subject, aud: "authenticated", role: "authenticated", email: identity.email, app_metadata: {}, user_metadata: {}, created_at: "2026-10-04T00:00:00Z" }
    await page.route("https://provider.example.test/**", async (route) => {
      const path = new URL(route.request().url()).pathname
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      return route.fulfill({ headers, json: path === "/auth/v1/token" ? { access_token: identity.token, refresh_token: "fixture-refresh", expires_in: 3600, token_type: "bearer", user } : user })
    })
    if (index === 1) {
      await page.route("http://127.0.0.1:8011/api/**", (route) => route.continue({ url: route.request().url().replace(":8011", ":8012") }))
      await page.addInitScript(() => {
        const NativeSocket = window.WebSocket
        window.WebSocket = class extends NativeSocket {
          constructor(url: string | URL, protocols?: string | string[]) {
            super(String(url).replace("127.0.0.1:8011", "127.0.0.1:8012"), protocols)
          }
        }
      })
    }
    await page.goto("/login?next=/studio")
    await page.getByLabel("Email").fill(identity.email)
    await page.locator("#password").fill("test-password")
    await page.locator("form").getByRole("button", { name: "Log in" }).click()
    await expect(page.getByRole("heading", { name: "Circuit Studio", exact: true })).toBeVisible()
  }

test("two authenticated browsers edit, chat, reload, and enforce revoked membership", async ({ browser, request }) => {
  const identities = await (await request.get("http://127.0.0.1:8011/browser-fixture")).json() as Identity[]
  const contexts = await Promise.all([browser.newContext(), browser.newContext()])
  const pages = await Promise.all(contexts.map((context) => context.newPage()))
  try {
    await login(pages[0], 0, identities)
    await login(pages[1], 1, identities)
    await pages[0].getByRole("button", { name: "Collaborate", exact: true }).click()
    await pages[0].getByRole("button", { name: "Generate party link", exact: true }).click()
    const link = await pages[0].getByRole("textbox", { name: "Generated party link" }).inputValue()
    expect(link).toContain("#invite=")
    await pages[0].getByRole("link", { name: "Open your party" }).click()
    await expect(pages[0].getByRole("region", { name: "Collaboration party" })).toContainText("Connected")
    await pages[1].goto(link)
    await expect(pages[1].getByRole("region", { name: "Collaboration party" })).toContainText("Connected")
    for (const page of pages) await page.getByText("Chat and invitations", { exact: true }).click()
    await pages[1].getByRole("textbox", { name: "Party message" }).fill("Let's build Bell together")
    await pages[1].getByRole("button", { name: "Send", exact: true }).click()
    await expect(pages[0].getByLabel("Party chat")).toContainText("Let's build Bell together")
    // Keyboard gate sequence is connected to the same Studio store and party adapter.
    await pages[0].getByRole("button", { name: "Add gate to sequence" }).click()
    await expect(pages[1].getByRole("table", { name: "Circuit gate sequence" })).toContainText("H")
    await pages[1].reload()
    await expect(pages[1].getByRole("table", { name: "Circuit gate sequence" })).toContainText("H")
    await pages[0].getByRole("button", { name: "Run saved party revision on Aer", exact: true }).click()
    await expect(pages[0].getByRole("table", { name: /Server sampled counts/ })).toBeVisible({ timeout: 30000 })
    await pages[0].getByRole("button", { name: "Explain saved circuit", exact: true }).click()
    await expect(pages[0].getByText(/This saved Hadamard gate creates equal measurement probabilities/)).toBeVisible()
    const partyId = new URL(pages[0].url()).searchParams.get("party")!
    const state = await (await request.get(`http://127.0.0.1:8011/api/v1/parties/${partyId}`, { headers: { Authorization: `Bearer ${identities[0].token}` } })).json()
    const editor = state.members.find((member: { role: string }) => member.role === "edit")
    await request.delete(`http://127.0.0.1:8011/api/v1/parties/${partyId}/members/${editor.id}`, { headers: { Authorization: `Bearer ${identities[0].token}` } })
    await expect(pages[1].getByRole("region", { name: "Collaboration party" }).getByRole("alert")).toContainText("Party is unavailable", { timeout: 15000 })
    await expect(pages[1].getByLabel("Party chat")).not.toBeVisible()
    await request.delete(`http://127.0.0.1:8011/api/v1/parties/${partyId}`, { headers: { Authorization: `Bearer ${identities[0].token}` } })
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})

test("hardware invitation shares components, routes, chat and roles across API instances", async ({ browser, request }) => {
  const identities = await (await request.get("http://127.0.0.1:8011/browser-fixture")).json() as Identity[]
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()])
  const pages = await Promise.all(contexts.map((context) => context.newPage()))
  try {
    for (let index = 0; index < pages.length; index++) {
      await login(pages[index], index, identities)
      await pages[index].goto("/hardware/studio")
      await pages[index].getByRole("button", { name: "List view", exact: true }).click()
    }
    await pages[0].getByRole("button", { name: "Place", exact: true }).click()
    await expect(pages[0].getByRole("heading", { name: "Placed components (1)", exact: true })).toBeVisible()
    await pages[0].getByRole("button", { name: "Collaborate", exact: true }).click()
    await pages[0].getByRole("button", { name: "Generate party link", exact: true }).click()
    const link = await pages[0].getByRole("textbox", { name: "Generated party link" }).inputValue()
    expect(link).toContain("/hardware/studio#invite=")
    await pages[0].getByRole("link", { name: "Open your party" }).click()
    await expect(pages[0].getByRole("region", { name: "Collaboration party" })).toContainText("Connected")
    await pages[1].goto(link)
    await expect(pages[1].getByRole("region", { name: "Collaboration party" })).toContainText("Connected")
    await pages[1].getByRole("button", { name: "List view", exact: true }).click()
    await expect(pages[1].getByRole("heading", { name: "Placed components (1)", exact: true })).toBeVisible()
    await pages[1].getByRole("button", { name: "Place", exact: true }).click()
    await expect(pages[0].getByRole("heading", { name: "Placed components (2)", exact: true })).toBeVisible()
    const partyId = new URL(pages[0].url()).searchParams.get("party")!
    const root = `http://127.0.0.1:8011/api/v1/parties/${partyId}`
    const headers = { Authorization: `Bearer ${identities[0].token}` }
    const state = await (await request.get(root, { headers })).json()
    expect(state.kind).toBe("hardware")
    const [first, second] = state.snapshot.placed
    await pages[0].getByLabel("From component", { exact: true }).selectOption(first.id)
    await pages[0].getByLabel("To component", { exact: true }).selectOption(second.id)
    await pages[0].getByRole("button", { name: "Connect", exact: true }).click()
    await expect(pages[1].getByRole("heading", { name: "Routes (1)", exact: true })).toBeVisible()
    // Persisted state reopens after losing the connection and reloading.
    await contexts[1].setOffline(true)
    await expect(pages[1].getByRole("region", { name: "Collaboration party" })).toContainText("Disconnected")
    await contexts[1].setOffline(false)
    await pages[1].reload()
    await expect(pages[1].getByRole("heading", { name: "Routes (1)", exact: true })).toBeVisible()
    for (const page of pages.slice(0, 2)) await page.getByText("Chat and invitations", { exact: true }).click()
    await pages[1].getByRole("textbox", { name: "Party message" }).fill("Check the shared wiring")
    await pages[1].getByRole("button", { name: "Send", exact: true }).click()
    await expect(pages[0].getByLabel("Party chat")).toContainText("Check the shared wiring")
    await pages[0].getByLabel("Invite access").selectOption("view")
    await pages[0].getByRole("button", { name: "Create invitation", exact: true }).click()
    const viewLink = await pages[0].getByRole("textbox", { name: "Party invitation link" }).inputValue()
    await pages[2].goto(viewLink)
    await expect(pages[2].getByRole("region", { name: "Collaboration party" })).toContainText("view")
    await pages[2].getByRole("button", { name: "List view", exact: true }).click()
    await pages[2].getByRole("button", { name: "Place", exact: true }).click()
    await expect(pages[2].getByRole("region", { name: "Collaboration party" }).getByRole("alert")).toContainText("Your role cannot edit")
    await expect(pages[2].getByRole("heading", { name: "Placed components (2)", exact: true })).toBeVisible()
    await expect(pages[2].getByRole("button", { name: "Run saved party revision on Aer" })).not.toBeVisible()
    // Shared state is excluded from automatic personal draft persistence.
    const persisted = await pages[1].evaluate(() => JSON.parse(localStorage.getItem("hardware:design-v1")!).state)
    expect(persisted.design.placed).toHaveLength(0)
    await pages[0].getByRole("button", { name: "Close party", exact: true }).click()
    await expect(pages[0].getByRole("heading", { name: "Placed components (1)", exact: true })).toBeVisible()
    await expect(pages[1].getByRole("region", { name: "Collaboration party" }).getByRole("alert")).toContainText("Party is unavailable", { timeout: 15000 })
    await expect(pages[1].getByLabel("Party chat")).not.toBeVisible()
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})

test("private circuit workspace persists across browsers, rejects stale edits, restores archives and resumes Aer and tutor results", async ({ browser, request }) => {
  test.setTimeout(90000)
  const identities = await (await request.get("http://127.0.0.1:8011/browser-fixture")).json() as Identity[]
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()])
  const pages = await Promise.all(contexts.map((context) => context.newPage()))
  try {
    await login(pages[0], 0, identities)
    await pages[0].getByTitle("Rename circuit").click()
    await pages[0].getByRole("textbox", { name: "Circuit name", exact: true }).fill("Private Hadamard")
    await pages[0].getByRole("textbox", { name: "Circuit name", exact: true }).press("Enter")
    await pages[0].getByRole("button", { name: "Add gate to sequence" }).click()
    await pages[0].getByRole("button", { name: "Save circuit", exact: true }).click()
    const workspace = pages[0].getByRole("region", { name: "Private circuit workspace" })
    await expect(workspace).toContainText("revision 1 · up to date")
    const circuitId = new URL(pages[0].url()).searchParams.get("circuit")!
    await login(pages[1], 0, identities)
    await pages[1].goto(`/studio?circuit=${circuitId}`)
    await expect(pages[1].getByRole("region", { name: "Private circuit workspace" })).toContainText("revision 1 · up to date")
    await expect(pages[1].getByRole("table", { name: "Circuit gate sequence" })).toContainText("H")
    // Keep the second browser's stale revision open while the first saves an edit.
    await pages[0].getByRole("button", { name: "Add gate to sequence" }).click()
    await pages[0].getByRole("button", { name: "Save circuit", exact: true }).click()
    await expect(workspace).toContainText("revision 2 · up to date")
    await pages[1].getByRole("combobox", { name: "Sequence gate type" }).selectOption("X")
    await pages[1].getByLabel("Sequence step", { exact: true }).fill("1")
    await pages[1].getByRole("button", { name: "Add gate to sequence" }).click()
    await pages[1].getByRole("button", { name: "Save circuit", exact: true }).click()
    await expect(pages[1].getByRole("region", { name: "Private circuit workspace" })).toContainText("Your edits are preserved")
    await expect(pages[1].getByRole("table", { name: "Circuit gate sequence" })).toContainText("X")
    await pages[1].getByTitle("Rename circuit").click()
    await pages[1].getByRole("textbox", { name: "Circuit name", exact: true }).fill("Recovered edits")
    await pages[1].getByRole("textbox", { name: "Circuit name", exact: true }).press("Enter")
    await pages[1].getByRole("button", { name: "Save as new circuit", exact: true }).click()
    await expect(pages[1].getByRole("region", { name: "Private circuit workspace" })).toContainText("revision 1 · up to date")
    expect(new URL(pages[1].url()).searchParams.get("circuit")).not.toBe(circuitId)
    const copyId = new URL(pages[1].url()).searchParams.get("circuit")!
    // Commit a real update, then lose its HTTP response. A retry must recover the exact revision.
    let loseResponse = true
    await pages[1].route(`http://127.0.0.1:8011/api/v1/circuits/${copyId}`, async (route) => {
      if (route.request().method() === "PUT" && loseResponse) {
        loseResponse = false
        const response = await route.fetch()
        expect(response.status()).toBe(200)
        await route.abort("failed")
      } else await route.continue()
    })
    await pages[1].getByRole("combobox", { name: "Sequence gate type" }).selectOption("Y")
    await pages[1].getByLabel("Sequence step", { exact: true }).fill("2")
    await pages[1].getByRole("button", { name: "Add gate to sequence" }).click()
    await pages[1].getByRole("button", { name: "Save circuit", exact: true }).click()
    await expect(pages[1].getByRole("region", { name: "Private circuit workspace" }).getByRole("alert")).toBeVisible()
    await pages[1].getByRole("button", { name: "Save circuit", exact: true }).click()
    await expect(pages[1].getByRole("region", { name: "Private circuit workspace" })).toContainText("revision 2 · up to date")
    // A different authenticated account cannot open the original private document.
    await login(pages[2], 1, identities)
    await pages[2].goto(`/studio?circuit=${circuitId}`)
    await expect(pages[2].getByRole("region", { name: "Private circuit workspace" }).getByRole("alert")).toContainText("Circuit not found")
    await expect(pages[2].getByRole("table", { name: "Circuit gate sequence" })).not.toContainText("H")
    await pages[0].getByRole("button", { name: "My circuits", exact: true }).first().click()
    const library = pages[0].getByRole("region", { name: "Private circuit library" }).first()
    await library.getByRole("button", { name: "Archive Private Hadamard", exact: true }).click()
    await expect(workspace).toContainText("Archived circuit · revision 3")
    await library.getByRole("button", { name: "Archived circuits", exact: true }).click()
    await library.getByRole("button", { name: "Restore Private Hadamard", exact: true }).click()
    await expect(workspace).toContainText("Saved circuit · revision 4")
    await pages[0].getByRole("button", { name: "Run saved circuit on Aer", exact: true }).click()
    await expect(workspace.getByRole("table", { name: "Saved Aer outcome comparison" })).toBeVisible({ timeout: 30000 })
    await expect(workspace).toContainText("circuit revision 4")
    const runId = new URL(pages[0].url()).searchParams.get("run")!
    expect(runId).toBeTruthy()
    await workspace.getByRole("button", { name: "Explain saved circuit", exact: true }).click()
    await expect(workspace.getByLabel("Saved circuit tutor messages")).toContainText("This saved Hadamard gate")
    const savedLink = pages[0].url()
    expect(savedLink).toContain("tutor=")
    await pages[1].goto(savedLink)
    await expect(pages[1].getByRole("table", { name: "Saved Aer outcome comparison" })).toBeVisible()
    await expect(pages[1].getByLabel("Saved circuit tutor messages")).toContainText("This saved Hadamard gate")
    await pages[1].reload()
    await expect(pages[1].getByRole("table", { name: "Saved Aer outcome comparison" })).toBeVisible()
    // Cloud documents never enter the anonymous browser draft or demo saved-circuit list.
    const draft = await pages[0].evaluate(() => JSON.parse(localStorage.getItem("studio:circuit-v1")!).state)
    expect(draft.circuit.gates).toHaveLength(0)
    expect(draft.savedCircuits).toHaveLength(0)
    const denied = await request.get(`http://127.0.0.1:8011/api/v1/experiments/runs/${runId}`, { headers: { Authorization: `Bearer ${identities[1].token}` } })
    expect(denied.status()).toBe(404)
  } finally { await Promise.all(contexts.map((context) => context.close())) }
})
