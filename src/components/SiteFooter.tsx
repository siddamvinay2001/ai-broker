import Link from "next/link";
import { Wordmark } from "@/components/Logo";

const FOOTER_LINKS = [
  { label: "Buy", href: "/listings?type=BUY" },
  { label: "Rent", href: "/listings?type=RENT" },
  { label: "Off-Plan", href: "/listings?type=OFFPLAN" },
  { label: "Brokers", href: "/brokers" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Wordmark className="inline-flex items-center gap-2 text-ink" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              AI-guided discovery for Dubai&apos;s finest addresses.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted"
          >
            {FOOTER_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="transition-colors hover:text-accent">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-hairline pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>Dubai property, guided by AI</p>
          <p>&copy; {new Date().getFullYear()} Majlis. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
