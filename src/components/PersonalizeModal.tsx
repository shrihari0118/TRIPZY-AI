import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { BudgetTier, TripPlanResult } from '../api/budgetPlanner';
import BudgetAllocationSliders, {
  AllocationRatios,
  DEFAULT_RATIOS,
} from './BudgetAllocationSliders';

/* ── Types ──────────────────────────────────────────────────────────────── */

export type PersonalizeSaveValues = {
  activities: string[];
  ratios?: AllocationRatios;
};

type PersonalizeModalProps = {
  isOpen: boolean;
  tier: BudgetTier | null;
  title: string;
  result: TripPlanResult | null;
  onClose: () => void;
  onSave: (values: PersonalizeSaveValues) => void;
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function buildCostRange(result: TripPlanResult | null): string {
  const min = result?.total_budget?.min ?? 0;
  const max = result?.total_budget?.max ?? 0;
  return `${formatINR(min)} - ${formatINR(max)}`;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function PersonalizeModal({
  isOpen,
  tier,
  title,
  result,
  onClose,
  onSave,
}: PersonalizeModalProps) {
  const [activities, setActivities] = useState<string[]>([]);
  const [activityInput, setActivityInput] = useState('');
  const [ratios, setRatios] = useState<AllocationRatios | null>(null);

  // ── Body scroll-lock ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Sync state when modal opens ───────────────────────────────────────
  useEffect(() => {
    if (!result) return;
    const combined = [
      ...(result.activities ?? []),
      ...(result.entertainment ?? []),
    ];
    setActivities(combined);
    setActivityInput('');
    setRatios(null);
  }, [result]);

  if (!isOpen || !result || !tier) {
    return null;
  }

  const effectiveRatios: AllocationRatios = ratios ?? DEFAULT_RATIOS[tier];

  const toggleActivity = (activity: string) => {
    setActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((item) => item !== activity)
        : [...prev, activity]
    );
  };

  const handleAddActivity = () => {
    const trimmed = activityInput.trim();
    if (!trimmed) return;
    setActivities((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setActivityInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
      <div className="relative flex h-full w-full max-w-md flex-col bg-[var(--panel)] shadow-2xl animate-slide-fade">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Personalize Plan
            </p>
            <h2 className="text-lg font-semibold text-[var(--ink)]">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[var(--border)] p-2 text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-6">

          {/* Transport (read-only from API) */}
          <div className="space-y-2 text-sm">
            <label className="font-semibold text-[var(--ink)]">
              Transport
            </label>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-3 text-sm text-[var(--muted)]">
              {result.transport?.mode ?? ''} – {result.transport?.name ?? ''}
            </div>
          </div>

          {/* Hotel (read-only from API) */}
          <div className="space-y-2 text-sm">
            <label className="font-semibold text-[var(--ink)]">
              Hotel
            </label>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-3 text-sm text-[var(--muted)]">
              {result.hotel?.name ?? ''}{' '}
              {result.hotel?.type ? `(${result.hotel.type})` : ''}
            </div>
          </div>

          {/* Food (read-only from API) */}
          <div className="space-y-2 text-sm">
            <label className="font-semibold text-[var(--ink)]">
              Food
            </label>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-3 text-sm text-[var(--muted)]">
              {(result.food ?? []).join(', ') || '—'}
            </div>
          </div>

          {/* Activities & Entertainment (editable) */}
          <div className="space-y-3 text-sm">
            <label className="font-semibold text-[var(--ink)]">
              Activities &amp; Entertainment
            </label>
            <div className="grid gap-2">
              {activities.map((activity) => (
                <label
                  key={activity}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleActivity(activity)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className="text-[var(--muted)]">{activity}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a custom activity"
                value={activityInput}
                onChange={(e) => setActivityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddActivity();
                }}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
              <button
                onClick={handleAddActivity}
                className="rounded-xl border border-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Budget Allocation Sliders ─────────────────────────────── */}
          <BudgetAllocationSliders
            tier={tier}
            costRange={buildCostRange(result)}
            ratios={effectiveRatios}
            onChange={(newRatios) => setRatios(newRatios)}
          />
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="border-t border-[var(--border)] px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onSave({
                  activities,
                  ratios: ratios ?? undefined,
                })
              }
              className="flex-1 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-900"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
