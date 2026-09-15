type LogoProps = {
  className?: string;
};

/// The mark is a pointed arch - the doorway of a majlis, the reception room
/// where people gather to talk and decide. Drawn with currentColor so it takes
/// the accent from whatever context it sits in.
export function LogoMark({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 25.5V15.2C9 10.4 12 6.3 16 4.2c4 2.1 7 6.2 7 11v10.3" />
      <path d="M7.5 26.8h17" />
    </svg>
  );
}

export function Wordmark({ className }: LogoProps) {
  return (
    <span className={className}>
      <LogoMark className="h-5 w-5 shrink-0 text-accent" />
      <span className="font-display text-lg tracking-[0.18em]">MAJLIS</span>
    </span>
  );
}
