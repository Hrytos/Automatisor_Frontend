import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <span className="font-serif text-7xl text-ink/10 mb-4">404</span>
      <h1 className="font-serif text-2xl text-ink mb-2">Report Not Found</h1>
      <p className="text-sm text-ink-soft font-light max-w-sm mb-8">
        The report you&apos;re looking for doesn&apos;t exist or the link may have
        expired. Check the URL and try again.
      </p>
      <Button variant="outline" className="gap-2" render={<Link href="/" />}>
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Home
      </Button>
    </div>
  );
}
