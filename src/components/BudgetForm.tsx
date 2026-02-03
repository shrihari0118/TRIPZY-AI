import { BadgeIndianRupee, CalendarDays, Flag, MapPin } from 'lucide-react';
import { BudgetPlanId } from '../data/budgetPlans';

export type BudgetFormValues = {
  startPlace: string;
  destinationPlace: string;
  startDate: string;
  endDate: string;
  budgetRange: BudgetPlanId;
};

type BudgetOption = {
  id: BudgetPlanId;
  title: string;
  costRange: string;
  description: string;
};

type BudgetFormProps = {
  values: BudgetFormValues;
  options: BudgetOption[];
  onFieldChange: (field: keyof BudgetFormValues, value: string) => void;
  onBudgetSelect: (value: BudgetPlanId) => void;
  onGenerate: () => void;
};

export default function BudgetForm({
  values,
  options,
  onFieldChange,
  onBudgetSelect,
  onGenerate,
}: BudgetFormProps) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          Budget Planner
        </p>
        <h1 className="text-3xl font-semibold text-[var(--ink)]">
          Build your travel budget in minutes
        </h1>
        <p className="max-w-2xl text-[var(--muted)]">
          Share your route, dates, and comfort level. The AI-ready budget
          planner drafts three clear plans you can personalize instantly.
        </p>
      </div>

      <div className="mt-8 grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
            Start Place
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="e.g., Pune"
                value={values.startPlace}
                onChange={(event) =>
                  onFieldChange('startPlace', event.target.value)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] py-3 pl-9 pr-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
            </div>
          </label>

          <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
            Destination Place
            <div className="relative">
              <Flag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="e.g., Jaipur"
                value={values.destinationPlace}
                onChange={(event) =>
                  onFieldChange('destinationPlace', event.target.value)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] py-3 pl-9 pr-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
            </div>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
            Start Date
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="date"
                value={values.startDate}
                onChange={(event) =>
                  onFieldChange('startDate', event.target.value)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] py-3 pl-9 pr-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
            </div>
          </label>

          <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
            End Date
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="date"
                value={values.endDate}
                onChange={(event) =>
                  onFieldChange('endDate', event.target.value)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] py-3 pl-9 pr-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
            </div>
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <BadgeIndianRupee className="h-4 w-4 text-[var(--accent)]" />
            Budget Range
          </div>
          <div className="flex flex-wrap gap-3">
            {options.map((option) => {
              const isActive = values.budgetRange === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onBudgetSelect(option.id)}
                  aria-pressed={isActive}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                    isActive
                      ? 'border-transparent bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-sm'
                      : 'border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)] hover:-translate-y-0.5 hover:border-[var(--accent-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  <div className="text-sm font-semibold">{option.title}</div>
                  <div className="text-xs">{option.costRange}</div>
                  <div className="text-xs opacity-80">{option.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          className="w-full rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900"
        >
          Generate Trip Plan
        </button>
      </div>
    </section>
  );
}
