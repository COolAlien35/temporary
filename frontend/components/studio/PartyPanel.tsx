"use client"

import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"
import { useSession } from "@/store/use-session"
import { useStudio } from "@/store/use-studio"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import type { SavedRun, SavedTutorMessage } from "@/lib/services/learning-loop-api"
import { connectedAccessToken } from "@/lib/services/connected-auth"
import { PartyApiError, partiesApi, partyOrigin, type Party, type PartyAction, type PartyDocument, type PartyKind } from "@/lib/services/parties-api"

import { partyEditor, partyPath } from "@/lib/services/party-editor"

export function PartyPanel({ kind = "circuit" }: { kind?: PartyKind }) {
  const path = partyPath(kind)
  const [editorReady, setEditorReady] = useState(kind === "circuit")
  const user = useSession((s) => s.user)
  const mode = useSession((s) => s.mode)
  const [party, setParty] = useState<Party<PartyDocument> | null>(null)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [sharedRun, setSharedRun] = useState<{ run: SavedRun; revision: number } | null>(null)
  const [tutor, setTutor] = useState<SavedTutorMessage | null>(null)
  const [asking, setAsking] = useState(false)
  const [running, setRunning] = useState(false)
  const runController = useRef<AbortController | null>(null)
  const chatRequest = useRef<PartyAction | null>(null)
  const [sendingChat, setSendingChat] = useState(false)
  const [text, setText] = useState("")
  const [invite, setInvite] = useState<{ id: string; link: string } | null>(null)
  const [role, setRole] = useState("edit")
  const [email, setEmail] = useState("")
  const [hours, setHours] = useState(24)
  const refreshRef = useRef<(() => Promise<void>) | null>(null)
  const restoreRef = useRef<(() => void) | null>(null)
  const [location, setLocation] = useState<{ id: string | null; token: string | null }>({ id: null, token: null })
  const { id, token: inviteToken } = location
  useEffect(() => {
    if (kind === "hardware") void import("@/store/use-hardware").then(async ({ useHardware }) => {
      if (!useHardware.persist.hasHydrated()) await useHardware.persist.rehydrate()
      setEditorReady(true)
    })
  }, [kind])
  useEffect(() => {
    const changed = () => setLocation({ id: new URLSearchParams(window.location.search).get("party"), token: window.location.hash.startsWith("#invite=") ? window.location.hash.slice(8) : null })
    changed()
    window.addEventListener("hashchange", changed)
    window.addEventListener("popstate", changed)
    return () => { window.removeEventListener("hashchange", changed); window.removeEventListener("popstate", changed) }
  }, [])

  useEffect(() => {
    setSharedRun(null)
    setTutor(null)
    setRunning(false)
    setAsking(false)
    return () => { runController.current?.abort() }
  }, [user?.id, id])

  useEffect(() => {
    setParty(null)
    setInvite(null)
    setText("")
    chatRequest.current = null
    setSendingChat(false)
    if (!id && !inviteToken) return
    if (!editorReady) return
    if (mode !== "connected" || !user) { setError("Sign in with a connected account, then reopen this invitation."); return }
    let active = true
    let applying = false
    let pumping = false
    let queuedRefresh = false
    let current: Party<PartyDocument> | null = null
    let pendingHardware: { before: PartyDocument; after: PartyDocument } | null = null
    let editTimer: ReturnType<typeof setTimeout> | null = null
    const queue: (PartyAction & { attempted?: boolean })[] = []
    const editor = partyEditor(kind)
    const original = editor.get()
    restoreRef.current = () => {
      active = false
      current = null
      queue.length = 0
      if (editTimer) clearTimeout(editTimer)
      socket.disconnect()
      applying = true
      editor.apply(original, false)
      applying = false
    }
    const socket = io(partyOrigin(), { transports: ["websocket"], autoConnect: false, auth: (done) => { void connectedAccessToken().then((token) => done({ token })).catch(() => done({ token: null })) } })
    const replace = (value: Party<PartyDocument>) => {
      if (!active) return
      current = value
      setParty(value)
      applying = true
      editor.apply(value.snapshot, true)
      applying = false
    }
    const refresh = async (force = false) => {
      if (!current || !active) return
      if (pumping || queue.length || pendingHardware) { queuedRefresh = true; return }
      const requestedId = current.id
      const value = await partiesApi.read<PartyDocument>(requestedId, current.revision)
      if (!active || pumping || queue.length || pendingHardware || current?.id !== requestedId) { queuedRefresh = true; return }
      if (value.revision >= current.revision && (force || value.revision > current.revision)) replace(value)
    }
    const fail = (cause: unknown) => {
      if (!active) return
      setError(cause instanceof Error ? cause.message : "Party connection failed.")
      if (cause instanceof PartyApiError && [401, 403, 404].includes(cause.status)) {
        current = null
        setParty(null)
        socket.disconnect()
        applying = true
        editor.apply(original, false)
        applying = false
      }
    }
    const pump = async () => {
      if (pumping || !current) return
      pumping = true
      try {
        while (queue.length && active && current) {
          const action = queue[0]
          if (!action.attempted) { action.base_revision = current.revision; action.attempted = true }
          const { attempted: _attempted, ...body } = action
          const event = await partiesApi.act(current.id, body)
          current = { ...current, revision: Math.max(current.revision, event.revision) }
          queue.shift()
        }
        setError("")
      } catch (cause) {
        // A rejected optimistic edit is discarded; reload authoritative state.
        if (cause instanceof PartyApiError && cause.status < 500) queue.length = 0
        fail(cause)
      } finally {
        pumping = false
        if (active && !queue.length) { queuedRefresh = false; await refresh(true).catch(fail) }
      }
    }
    refreshRef.current = async () => { if (queue.length) await pump(); else await refresh(true) }
    const unsubscribe = editor.subscribe((before, after) => {
      if (applying || !current || !active) return
      if (!["owner", "edit"].includes(current.role) || !socket.connected) {
        replace(current)
        setError(socket.connected ? "Your role cannot edit this design." : "Reconnect before editing the party design.")
        return
      }
      const enqueue = (previous: PartyDocument, next: PartyDocument) => {
        if (!current || !active) return
        for (const operation of editor.operations(previous, next)) queue.push({ ...operation, event_id: crypto.randomUUID(), circuit_id: current.circuit_id, base_revision: current.revision })
        void pump()
      }
      if (kind === "hardware") {
        // Coalesce pointer movement and compound changes into one atomic hardware edit.
        pendingHardware = { before: pendingHardware?.before ?? before, after }
        if (editTimer) clearTimeout(editTimer)
        editTimer = setTimeout(() => {
          const pending = pendingHardware
          pendingHardware = null
          editTimer = null
          if (pending) enqueue(pending.before, pending.after)
        }, 150)
      } else enqueue(before, after)
    })
    socket.on("connect", () => {
      setStatus("Connected")
      if (current) socket.emit("join", { party_id: current.id, after: current.revision }, (reply: { ok: boolean; party?: Party<PartyDocument> }) => { if (active && current && reply.ok && reply.party && reply.party.kind === kind && !pumping && !queue.length && !pendingHardware && reply.party.revision >= current.revision) replace(reply.party) })
      void refresh().catch(fail)
    })
    socket.on("disconnect", () => { if (active) setStatus("Disconnected — reconnecting") })
    socket.on("connect_error", () => { if (active) setStatus("Connection unavailable — retrying") })
    socket.on("party_changed", (event: { party_id: string }) => { if (event.party_id === current?.id) void refresh().catch(fail) })
    setStatus("Joining party…")
    void (inviteToken ? partiesApi.accept<PartyDocument>(inviteToken) : partiesApi.read<PartyDocument>(id!)).then((value) => {
      if (!active) return
      if (value.kind !== kind) { window.location.assign(`${partyPath(value.kind)}?party=${value.id}`); return }
      replace(value)
      window.history.replaceState(window.history.state, "", `${path}?party=${value.id}`)
      setLocation({ id: value.id, token: null })
      socket.connect()
    }).catch(fail)
    const heartbeat = setInterval(() => {
      if (!active || !current) return
      if (socket.connected) socket.emit("heartbeat", {}, (reply: { ok: boolean; connections?: number }) => { if (active) setStatus(reply.ok ? `Connected · ${reply.connections ?? 1} live connections` : "Membership unavailable") })
      // Snapshot polling also recovers missed Redis notifications.
      if (queuedRefresh || !pumping) void refresh().catch(fail)
    }, 10000)
    return () => {
      active = false
      refreshRef.current = null
      restoreRef.current = null
      clearInterval(heartbeat)
      if (editTimer) clearTimeout(editTimer)
      unsubscribe()
      socket.disconnect()
      editor.apply(original, false)
    }
  }, [id, inviteToken, mode, user?.id, kind, path, editorReady])

  async function runSavedRevision() {
    if (!party || running) return
    const controller = new AbortController()
    runController.current?.abort()
    runController.current = controller
    setRunning(true)
    setSharedRun(null)
    setTutor(null)
    try {
      const frozen = await partiesApi.read(party.id)
      if (controller.signal.aborted) return
      const api = connectedLearningLoopApi()
      const copied = await partiesApi.freeze(party.id, frozen.revision, crypto.randomUUID())
      const saved = copied.circuit
      if (controller.signal.aborted) return
      const accepted = await api.submitRun({ circuit_id: saved.id, circuit_revision: saved.revision, backend: "qiskit_aer", shots: useStudio.getState().shots }, crypto.randomUUID())
      const deadline = Date.now() + 90000
      while (!controller.signal.aborted && Date.now() < deadline) {
        const run = await api.getRun(accepted.resource_id, controller.signal)
        if (!["queued", "running"].includes(run.status)) { setSharedRun({ run, revision: frozen.revision }); break }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      if (!controller.signal.aborted && Date.now() >= deadline) setError(`Run ${accepted.resource_id} is still processing. Its result remains saved in your account.`)
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Shared run failed.") }
    finally { if (!controller.signal.aborted) setRunning(false) }
  }

  async function explainRun() {
    if (!sharedRun || asking) return
    const actorId = user?.id
    setAsking(true)
    try {
      const api = connectedLearningLoopApi()
      const unit = await api.getCurriculumUnit("u1")
      if (useSession.getState().user?.id !== actorId) return
      const session = await api.createSession({ lesson_id: "u1-quantum-foundations", lesson_version: unit.content_version }, crypto.randomUUID())
      if (useSession.getState().user?.id !== actorId) return
      const message = await api.sendTutorMessage(session.id, { action: "explain", stage: "build", prompt: "Explain this saved shared circuit revision. Identify what its gates do and suggest one test to try next.", circuit_id: sharedRun.run.circuit_id, circuit_revision: sharedRun.run.circuit_revision }, crypto.randomUUID())
      if (useSession.getState().user?.id === actorId) setTutor(message)
    } catch (cause) { if (useSession.getState().user?.id === actorId) setError(cause instanceof Error ? cause.message : "Tutor request failed.") }
    finally { if (useSession.getState().user?.id === actorId) setAsking(false) }
  }

  async function sendChat() {
    if (!party || sendingChat || !text.trim()) return
    const actorId = user?.id
    const message = text.trim()
    const body = chatRequest.current?.text === message ? chatRequest.current : { event_id: crypto.randomUUID(), circuit_id: party.circuit_id, base_revision: party.revision, kind: "chat" as const, text: message }
    chatRequest.current = body
    setSendingChat(true)
    try {
      await partiesApi.act(party.id, body)
      if (useSession.getState().user?.id !== actorId) return
      chatRequest.current = null
      setText("")
      await refreshRef.current?.()
    } catch (cause) {
      if (useSession.getState().user?.id !== actorId) return
      if (cause instanceof PartyApiError && cause.status < 500) chatRequest.current = null
      setError(cause instanceof Error ? cause.message : "Chat request failed; send again to retry.")
    } finally { if (useSession.getState().user?.id === actorId) setSendingChat(false) }
  }

  if (!id && !inviteToken) return null
  const names = new Map(party?.members.map((member) => [member.id, member.name]))
  const leave = async () => {
    try {
      if (party && user) await (party.role === "owner" ? partiesApi.close(party.id) : partiesApi.remove(party.id, user.id))
      restoreRef.current?.()
      window.location.assign(path)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not leave.") }
  }
  return <section aria-label="Collaboration party" className="mb-4 space-y-3 rounded-xl border border-cyan-400/30 bg-[#101722] p-4 text-white">
    <div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold">{kind === "hardware" ? "Hardware study party" : "Study party"}</h2><p role="status" aria-live="polite" className="text-xs text-cyan-200">{status}{party && ` · revision ${party.revision} · ${party.role}`}</p><button className="ml-auto text-xs underline" onClick={() => void leave()}>{party?.role === "owner" ? "Close party" : "Leave party"}</button></div>
    {error && <p role="alert" className="text-sm text-rose-300">{error} <button className="underline" onClick={() => void refreshRef.current?.().catch((cause) => setError(String(cause)))}>Reload party</button></p>}
    {party && <>
      <ul className="flex flex-wrap gap-3 text-xs">{party.members.map((member) => <li key={member.id}>{member.name} ({member.role}) {party.role === "owner" && member.role !== "owner" && <button className="underline" aria-label={`Remove ${member.name}`} onClick={() => void partiesApi.remove(party.id, member.id).then(() => refreshRef.current?.()).catch((cause) => setError(String(cause)))}>Remove</button>}</li>)}</ul>
      <details><summary className="cursor-pointer text-sm">Chat and invitations</summary><div className="mt-3 grid gap-4 md:grid-cols-2">
        <div><ol aria-label="Party chat" className="max-h-40 space-y-2 overflow-y-auto text-sm">{party.chat.map((event) => <li key={event.event_id}><strong>{names.get(event.actor_id) ?? "Former member"}:</strong> {event.payload.text}</li>)}</ol>
          {party.role !== "view" && <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); void sendChat() }}><input aria-label="Party message" maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} className="min-w-0 flex-1 rounded bg-black/30 p-2 text-sm" /><button type="submit" disabled={!text.trim() || sendingChat} className="text-sm text-cyan-200">Send</button></form>}
        </div>
        {party.role === "owner" && <div className="space-y-2"><label className="block text-xs">Invite access <select className="bg-slate-900 p-1" value={role} onChange={(event) => setRole(event.target.value)}><option value="edit">Edit</option><option value="comment">Comment</option><option value="view">View</option></select></label><label className="block text-xs">Email restriction (optional) <input type="email" className="bg-black/30 p-1" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block text-xs">Expires after <select value={hours} onChange={(event) => setHours(Number(event.target.value))} className="bg-slate-900 p-1"><option value={24}>24 hours</option><option value={168}>7 days</option></select></label><button className="text-xs underline" onClick={() => void partiesApi.invite(party.id, role, email.trim() || null, hours).then((value) => setInvite({ id: value.id, link: `${window.location.origin}${path}#invite=${value.token}` })).catch((cause) => setError(String(cause)))}>Create invitation</button>
          {invite && <div><input aria-label="Party invitation link" readOnly value={invite.link} className="w-full bg-black/30 p-2 text-xs" onFocus={(event) => event.target.select()} /><button className="text-xs underline" onClick={() => void partiesApi.revoke(party.id, invite.id).then(() => setInvite(null)).catch((cause) => setError(String(cause)))}>Revoke invitation</button></div>}
        </div>}
      </div></details>
      {kind === "circuit" && <div><button disabled={running} onClick={() => void runSavedRevision()} className="text-xs text-cyan-200 underline disabled:opacity-50">{running ? "Running saved party revision…" : "Run saved party revision on Aer"}</button>
      {sharedRun && <div role="status" className="mt-2 text-xs">Party revision {sharedRun.revision} · saved circuit revision {sharedRun.run.circuit_revision} · {sharedRun.run.backend} · {sharedRun.run.status} · run {sharedRun.run.id}
        {Boolean(sharedRun.run.result?.counts) && <table className="mt-2 text-left"><caption>Server sampled counts ({sharedRun.run.shots} shots)</caption><thead><tr><th>Outcome</th><th>Count</th></tr></thead><tbody>{Object.entries(sharedRun.run.result!.counts as Record<string, number>).map(([label, count]) => <tr key={label}><th>{label}</th><td>{count}</td></tr>)}</tbody></table>}
        {sharedRun.run.status === "succeeded" && <button disabled={asking} onClick={() => void explainRun()} className="mt-2 text-xs text-cyan-200 underline">{asking ? "Asking tutor…" : "Explain saved circuit"}</button>}
        {tutor && <p role="status" className="mt-2 text-xs">{tutor.response_text} · {tutor.role.replaceAll("_", " ")} · saved message {tutor.id}</p>}
      </div>}</div>}
      <p className="text-xs text-white/50">{kind === "hardware" ? "Component and wiring edits merge in server acceptance order. Stage/component deletion removes attached wiring. Invalid edits are rejected and reloaded. Diagnostics describe the current shared design." : "Gate edits merge in server acceptance order. Invalid edits are rejected and reloaded. The toolbar Run previews locally; Aer saves an immutable copy in your account."}</p>
    </>}
  </section>
}
