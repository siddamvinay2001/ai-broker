const FOOTER_LINKS = ["Buy", "Rent", "Off-Plan", "Brokers"] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-sm tracking-[0.28em] text-ink">
              BRICK &amp; MUSK
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              AI-guided discovery for Dubai&apos;s finest addresses.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted"
          >
            {FOOTER_LINKS.map((link) => (
              <a key={link} href="#" className="transition-colors hover:text-accent">
                {link}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-hairline pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>RERA 48328 | License 1458200</p>
          <p>&copy; {new Date().getFullYear()} Brick &amp; Musk. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
