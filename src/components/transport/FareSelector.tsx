import type { FareOption } from '../../api/budgetPlanner';
import { formatInr } from '../../utils/pricingUtils';

type FareSelectorProps = {
  fareOptions: FareOption[];
  selectedFareType: string | null;
  recommendedFareType: string | null;
  travellersCount: number;
  isLocked?: boolean;
  onSelectFare: (fareType: string) => void;
};

const AVAILABILITY_STYLES: Record<string, string> = {
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'Few Left': 'border-amber-200 bg-amber-50 text-amber-800',
  'Not Available': 'border-rose-200 bg-rose-50 text-rose-800',
};

export default function FareSelector({
  fareOptions,
  selectedFareType,
  recommendedFareType,
  travellersCount,
  isLocked = false,
  onSelectFare,
}: FareSelectorProps) {
  if (fareOptions.length === 0) {
    return (
      <section className="mt-6 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-6 text-sm text-[var(--muted)]">
        Fare choices are not available for this service yet.
      </section>
    );
  }

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
      {fareOptions.map((fare) => {
        const isSelected = fare.type === selectedFareType;
        const isRecommended = fare.type === recommendedFareType;
        const isUnavailable = fare.availability === 'Not Available';
        const isDisabled = isUnavailable || isLocked;

        return (
          <button
            key={fare.type}
            type="button"
            onClick={() => onSelectFare(fare.type)}
            disabled={isDisabled}
            className={`relative flex h-full flex-col rounded-[26px] border p-5 text-left transition ${
              isSelected
                ? 'border-transparent bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/30'
                : 'border-[var(--border)] bg-[var(--panel-muted)] hover:-translate-y-0.5 hover:shadow-sm'
            } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {isRecommended && (
              <span className="absolute right-4 top-4 rounded-full bg-[var(--ink)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                Recommended
              </span>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                    Fare Type
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-[var(--ink)]">{fare.type}</h3>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${AVAILABILITY_STYLES[fare.availability] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
                >
                  {fare.availability}
                </span>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Price Per Traveller
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">
                  {formatInr(fare.price)}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-[var(--muted)]">
                <span>Total for {travellersCount} travellers</span>
                <span className="font-semibold text-[var(--ink)]">
                  {formatInr(fare.price * travellersCount)}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}
