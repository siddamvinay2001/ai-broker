import type { PaymentSchedule } from "@/lib/investment";
import { formatAed } from "@/components/format";

type PaymentTimelineProps = {
  schedule: PaymentSchedule;
};

export function PaymentTimeline({ schedule }: PaymentTimelineProps) {
  if (schedule.milestones.length === 0) return null;

  return (
    <div className="rounded-2xl border border-hairline bg-surface/40 p-6 sm:p-8">
      <p className="mb-5 text-xs font-medium tracking-[0.3em] text-accent">
        PAYMENT PLAN
      </p>

      <ol className="space-y-5 border-l border-hairline pl-5">
        {schedule.milestones.map((milestone, i) => (
          <li key={i} className="relative">
            <span
              aria-hidden
              className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border border-accent bg-ground"
            />
            <p className="text-sm text-ink">
              {milestone.label} &middot; {milestone.pct}%
            </p>
            <p className="mt-1 font-display text-lg text-ink">
              {formatAed(milestone.amountAed)}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">{milestone.dueLabel}</p>
          </li>
        ))}
      </ol>

      {schedule.warning && (
        <p className="mt-6 border-t border-hairline pt-5 text-xs leading-relaxed text-ink-faint">
          {schedule.warning}
        </p>
      )}
    </div>
  );
}
