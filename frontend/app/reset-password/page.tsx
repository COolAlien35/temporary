import { ResetPasswordPanel } from "@/components/account/ResetPasswordPanel"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; preview?: string | string[] }>
}) {
  const query = await searchParams
  const token = typeof query.token === "string" ? query.token : null
  const preview = !token && (query.preview === "expired" || query.preview === "invalid") ? query.preview : null

  return <main className="flex min-h-screen items-center justify-center bg-[#0A0E17] px-5 py-12 text-white">
    <ResetPasswordPanel token={token} preview={preview} />
  </main>
}
