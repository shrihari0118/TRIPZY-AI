import type { TransportTimelineItem } from '../../context/TripContext';

type TimelineProps = {
  items: TransportTimelineItem[];
};

const KIND_META: Record<
  TransportTimelineItem['kind'],
  { label: string; dotClass: string; badgeClass: string }
> = {
  boarding: {
    label: 'Boarding',
    dotClass: 'border-emerald-200 bg-emerald-500',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  stop: {
    label: 'Stop',
    dotClass: 'border-sky-200 bg-sky-500',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  dropping: {
    label: 'Drop',
    dotClass: 'border-rose-200 bg-rose-500',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-800',
  },
};

export default function Timeline({ items }: TimelineProps) {
  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm md:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Route Flow</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">Boarding to Drop</h2>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
          {items.length} points
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-6 text-sm text-[var(--muted)]">
          Timeline details are not available for this service.
        </div>
      ) : (
        <div className="mt-6">
          {items.map((item, index) => {
            const meta = KIND_META[item.kind];

            return (
              <div
                key={`${item.kind}-${item.time}-${item.name}-${index}`}
                className="grid grid-cols-[72px_24px_minmax(0,1fr)] gap-3 pb-6 last:pb-0"
              >
                <div className="pt-1 text-right text-sm font-semibold text-[var(--ink)]">
                  {item.time}
                </div>

                <div className="relative flex justify-center">
                  <span className={`mt-1 h-4 w-4 rounded-full border-[3px] ${meta.dotClass}`} />
                  {index < items.length - 1 && (
                    <span className="absolute top-5 h-[calc(100%-0.25rem)] w-px bg-[var(--border)]" />
                  )}
                </div>

                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[var(--ink)]">{item.name}</h3>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
