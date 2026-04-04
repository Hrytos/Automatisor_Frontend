import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-footer-dark text-white/80 mt-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-12 md:px-12">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          {/* Brand */}
          <div className="max-w-xs">
            <span className="font-serif text-xl text-white tracking-tight">
              Automati<span className="text-orange">SOR</span>
            </span>
            <p className="text-sm text-white/50 mt-2 font-light leading-relaxed">
              Independent warehouse automation advisor. Data-driven assessments
              for operations leaders.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-white/40 text-xs uppercase tracking-wider mb-1">
                Product
              </span>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <Link
                href="/questionnaire"
                className="hover:text-white transition-colors"
              >
                Diagnostic
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-white/40 text-xs uppercase tracking-wider mb-1">
                Company
              </span>
              <span className="text-white/30 cursor-default">About</span>
              <span className="text-white/30 cursor-default">Contact</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-xs text-white/30 flex justify-between">
          <span>&copy; {new Date().getFullYear()} Hrytos. All rights reserved.</span>
          <span>AutomatiSOR</span>
        </div>
      </div>
    </footer>
  );
}
