"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy, Link2, LockKeyhole, Users, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

import { useSession } from "@/store/use-session"
import { useStudio } from "@/store/use-studio"
import { useHardware } from "@/store/use-hardware"
import { partiesApi } from "@/lib/services/parties-api"

type JoinPolicy = "anyone" | "invited"
type Access = "edit" | "comment" | "view"

export function CollaborationDialog({ designName, snapshot, kind = "circuit" }: {
  designName: string
  snapshot: string
  kind?: "circuit" | "hardware design"
}) {
  const mode = useSession((s) => s.mode)
  const actorId = useSession((s) => s.user?.id)
  const createKey = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [partyId, setPartyId] = useState<string | null>(null)
  const [expiry, setExpiry] = useState(24)
  const [open, setOpen] = useState(false)
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>("anyone")
  const [access, setAccess] = useState<Access>("edit")
  const [capacity, setCapacity] = useState("6")
  const [email, setEmail] = useState("")
  const [link, setLink] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => { setPartyId(null); setLink(""); setBusy(false); createKey.current = null }, [actorId, mode])

  async function createLink() {
    if (mode === "connected") {
      const requestActor = actorId
      setBusy(true)
      try {
        const key = createKey.current ??= crypto.randomUUID()
        const party = partyId ? { id: partyId } : kind === "hardware design"
          ? await partiesApi.createHardware(useHardware.getState().design, Number(capacity), key)
          : await partiesApi.create(useStudio.getState().circuit, Number(capacity), key)
        if (useSession.getState().user?.id !== requestActor) return
        setPartyId(party.id)
        const invitation = await partiesApi.invite(party.id, access, joinPolicy === "invited" ? email.trim() : null, expiry)
        if (useSession.getState().user?.id !== requestActor) return
        setLink(`${window.location.origin}${kind === "hardware design" ? "/hardware/studio" : "/studio"}#invite=${invitation.token}`)
        setCopied(false)
      } catch (cause) { if (useSession.getState().user?.id === requestActor) toast.error(cause instanceof Error ? cause.message : "Could not create party") }
      finally { if (useSession.getState().user?.id === requestActor) setBusy(false) }
      return
    }
    const invite = new URL(window.location.href)
    invite.searchParams.delete("party")
    invite.hash = kind === "circuit" ? `c=${snapshot}` : `design=${snapshot}`
    setLink(invite.toString())
    setCopied(false)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success("Party link copied")
    } catch {
      toast.error("Could not copy the link. Select and copy it instead.")
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => { setOpen(true); setLink("") }} className="gap-1.5 border-white/10 bg-transparent text-white/75 hover:bg-white/5 hover:text-white">
        <UsersRound className="h-3.5 w-3.5" /> Collaborate
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#101722] text-white">
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl border border-[#00D4FF]/20 bg-[#00D4FF]/10 text-[#00D4FF]"><Users className="h-5 w-5" /></div>
            <DialogTitle>Start a collaboration party</DialogTitle>
            <DialogDescription>Invite up to {capacity} people to work on “{designName}” together.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div>
              <label htmlFor="party-capacity" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">Party size</label>
              <select id="party-capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0A0E17] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00D4FF]/50">
                {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} people total, including you</option>)}
              </select>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Who can join?</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["anyone", "invited"] as const).map((policy) => (
                  <button key={policy} type="button" onClick={() => setJoinPolicy(policy)} className={`rounded-lg border p-3 text-left transition ${joinPolicy === policy ? "border-[#00D4FF]/50 bg-[#00D4FF]/[0.08]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}>
                    <span className="flex items-center gap-2 text-sm font-medium">{policy === "anyone" ? <Link2 className="h-4 w-4 text-[#00D4FF]" /> : <LockKeyhole className="h-4 w-4 text-[#00D4FF]" />}{policy === "anyone" ? "Anyone with link" : "Invited people"}</span>
                    <span className="mt-1 block text-xs leading-4 text-white/45">{policy === "anyone" ? "Signed-in link holders can join" : "Only people you invite can join"}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Their access
                <select value={access} onChange={(e) => setAccess(e.target.value as Access)} className="mt-2 block w-full rounded-lg border border-white/10 bg-[#0A0E17] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-[#00D4FF]/50">
                  <option value="edit">Can edit</option><option value="comment">Can comment</option><option value="view">Can view</option>
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Link expires
                <select value={expiry} onChange={(e) => setExpiry(Number(e.target.value))} className="mt-2 block w-full rounded-lg border border-white/10 bg-[#0A0E17] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-[#00D4FF]/50">
                  <option value={24}>After 24 hours</option><option value={168}>After 7 days</option>
                </select>
              </label>
            </div>

            {joinPolicy === "invited" && <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">Invite by email <span className="font-normal normal-case tracking-normal">(required for invited people)</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" className="mt-2 block w-full rounded-lg border border-white/10 bg-[#0A0E17] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-[#00D4FF]/50" />
            </label>}

            {link && <div className="rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/[0.05] p-3">
              <p className="mb-2 text-xs font-medium text-[#00D4FF]">{mode === "connected" ? "Authenticated party invitation" : "Demo snapshot link"}</p>
              <div className="flex gap-2"><input readOnly value={link} aria-label="Generated party link" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 py-2 text-xs text-white/75 outline-none" /><Button type="button" size="sm" onClick={copyLink} className="shrink-0 gap-1.5 bg-[#00D4FF] text-[#07111a] hover:bg-[#52e3ff]">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</Button></div>
              <p className="mt-2 text-[11px] leading-4 text-white/40">{mode === "connected" ? "Share this invitation manually. Recipients sign in before joining." : "Opens a separate copy. Sign in with a connected account for shared editing and chat."}</p>
            </div>}
          </div>

          {partyId && <a className="text-sm text-cyan-200 underline" href={`${kind === "hardware design" ? "/hardware/studio" : "/studio"}?party=${partyId}`}>Open your party</a>}
          <DialogFooter className="sm:justify-between sm:items-center">
            <span className="text-[11px] text-white/35">2–6 people · {access} access · {joinPolicy === "anyone" ? "link access" : "invite only"}</span>
            <Button type="button" onClick={() => void createLink()} disabled={busy || (mode === "connected" && joinPolicy === "invited" && !email.trim())} className="bg-[#00D4FF] font-semibold text-[#07111a] hover:bg-[#52e3ff]">{busy ? "Creating…" : link ? "Regenerate link" : "Generate party link"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
