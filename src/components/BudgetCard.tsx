import type { KeyboardEvent } from 'react';
import {
  Hotel,
  Landmark,
  Ticket,
  Train,
  Utensils,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { BudgetGenerateResponse, TripPlanResult, BudgetTier } from '../api/budgetPlanner';
import { useTripContext } from '../context/TripContext';

type BudgetCardProps = {
  trip: BudgetGenerateResponse;
  tier: BudgetTier;
  title: string;
  result: TripPlanResult;
  isSelected: boolean;
  onPersonalize: () => void;
};

function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function BudgetCard({
  trip,
  title,
  result,
  isSelected,
  onPersonalize,
}: BudgetCardProps) {
  const navigate = useNavigate();
  const { setSelectedTrip } = useTripContext();
  const combinedTags = [
    ...(result?.activities?.slice(0, 3) ?? []),
    ...(result?.entertainment?.slice(0, 2) ?? []),
  ];

  const handleCardClick = () => {
    setSelectedTrip(trip);
    navigate('/itinerary/transport');
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`relative flex h-full flex-col rounded-3xl border bg-[var(--panel)] p-6 shadow-sm transition-all ${isSelected
          ? 'border-transparent ring-2 ring-[var(--glow)]/60 shadow-[0_20px_50px_rgba(16,185,129,0.2)] scale-[1.02] cursor-pointer'
          : 'border-[var(--border)] hover:-translate-y-1 hover:shadow-lg cursor-pointer'
        }`}
    >
      {isSelected && (
        <span className="absolute -top-3 right-6 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
          Recommended for You
        </span>
      )}

      {/* ── Title + Budget ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Budget Plan
        </p>
        <h2 className="text-xl font-semibold text-[var(--ink)]">
          {title}
        </h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Estimated Total Cost
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">
            {formatINR(result?.total_budget?.min ?? 0)} –{' '}
            {formatINR(result?.total_budget?.max ?? 0)}
          </p>
        </div>
      </div>

      {/* ── Detail rows ─────────────────────────────────────────────────── */}
      <div className="mt-6 flex-1 space-y-4 text-sm">
        {/* Transport */}
        <div className="flex gap-3">
          <Train className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">Transport Option</p>
            <p className="text-[var(--muted)]">
              {formatLabel(result?.transport?.mode ?? '')} – {result?.transport?.name ?? ''}
            </p>
          </div>
        </div>

        {/* Hotel */}
        <div className="flex gap-3">
          <Hotel className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">Accommodation</p>
            <p className="text-[var(--muted)]">
              {result?.hotel?.name ?? ''}{' '}
              {result?.hotel?.type ? `(${formatLabel(result.hotel.type)})` : ''}
            </p>
          </div>
        </div>

        {/* Food */}
        <div className="flex gap-3">
          <Utensils className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">Food Plan</p>
            <p className="text-[var(--muted)]">
              {(result?.food?.slice(0, 3) ?? []).join(', ') || '—'}
            </p>
          </div>
        </div>

        {/* Tourist Places */}
        <div className="flex gap-3">
          <Landmark className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">Tourist Spots</p>
            <p className="text-[var(--muted)]">
              {(result?.tourist_places?.slice(0, 3) ?? []).join(', ') || '—'}
            </p>
          </div>
        </div>

        {/* Activities & Entertainment */}
        <div className="flex gap-3">
          <Ticket className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">
              Activities &amp; Entertainment
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {combinedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-1 text-xs font-medium text-[var(--muted)]"
                >
                  {tag}
                </span>
              ))}
              {combinedTags.length === 0 && (
                <span className="text-xs text-[var(--muted)]">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Personalize Plan Button ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onPersonalize();
        }}
        className="mt-6 w-full rounded-2xl border border-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-soft)]"
      >
        Personalize Plan
      </button>
    </article>
  );
}
