import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "No report found — Automatisor",
}

export default function NoReportPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">No report found</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        There is no operations report associated with your account yet.
        Contact the Hrytos team to get started.
      </p>
      <Button variant="outline" render={<Link href="/login" />}>
        Back to sign in
      </Button>
    </div>
  )
}
