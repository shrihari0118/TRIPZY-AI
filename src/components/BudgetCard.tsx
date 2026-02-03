import {
  Hotel,
  Landmark,
  Ticket,
  Train,
  Utensils,
} from 'lucide-react';
import { BudgetPlan } from '../data/budgetPlans';

type BudgetCardProps = {
  plan: BudgetPlan;
  isSelected: boolean;
  onPersonalize: () => void;
};

export default function BudgetCard({
  plan,
  isSelected,
  onPersonalize,
}: BudgetCardProps) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-3xl border bg-[var(--panel)] p-6 shadow-sm transition-all ${
        isSelected
          ? 'border-transparent ring-2 ring-[var(--glow)]/60 shadow-[0_20px_50px_rgba(16,185,129,0.2)] scale-[1.02]'
          : 'border-[var(--border)] hover:-translate-y-1 hover:shadow-lg'
      }`}
    >
      {isSelected && (
        <span className="absolute -top-3 right-6 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
          Recommended for You
        </span>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Budget Plan
        </p>
        <h2 className="text-xl font-semibold text-[var(--ink)]">
          {plan.title}
        </h2>
        <p className="text-sm text-[var(--muted)]">{plan.description}</p>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Estimated Total Cost
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">
            {plan.costRange}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4 text-sm">
        <div className="flex gap-3">
          <Train className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">Transport Option</p>
            <p className="text-[var(--muted)]">{plan.transport}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Hotel className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">Accommodation</p>
            <p className="text-[var(--muted)]">{plan.accommodation}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Utensils className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">Food Plan</p>
            <p className="text-[var(--muted)]">{plan.food}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Landmark className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">Tourist Spots</p>
            <p className="text-[var(--muted)]">{plan.spots}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Ticket className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">
              Activities &amp; Entertainment
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {plan.activities.slice(0, 4).map((activity) => (
                <span
                  key={activity}
                  className="rounded-full border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-1 text-xs font-medium text-[var(--muted)]"
                >
                  {activity}
                </span>
              ))}
              {plan.activities.length > 4 && (
                <span className="text-xs text-[var(--muted)]">
                  +{plan.activities.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onPersonalize}
        className="mt-6 w-full rounded-2xl border border-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-soft)]"
      >
        Personalize Plan
      </button>
    </article>
  );
}
