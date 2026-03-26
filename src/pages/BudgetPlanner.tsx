import { useCallback, useState } from 'react';
import { RefreshCw, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BudgetForm, { type BudgetFormValues } from '../components/BudgetForm';
import {
  generateBudgetPlan,
  type BudgetTier,
} from '../api/budgetPlanner';
import type { BudgetResultsNavigationState } from './BudgetResults';

const initialValues: BudgetFormValues = {
  startPlace: '',
  destinationPlace: '',
  startDate: '',
  endDate: '',
  budgetRange: 'moderate',
};

const BUDGET_OPTIONS = [
  {
    id: 'budget',
    title: 'Budget',
    costRange: 'Lower spend',
    description: 'Value transport, practical stays, local food',
  },
  {
    id: 'moderate',
    title: 'Moderate',
    costRange: 'Balanced spend',
    description: 'Comfort travel, solid hotel options, curated stops',
  },
  {
    id: 'luxury',
    title: 'Luxury',
    costRange: 'Premium spend',
    description: 'High-comfort travel, polished stays, richer experiences',
  },
] satisfies Array<{
  id: BudgetFormValues['budgetRange'];
  title: string;
  costRange: string;
  description: string;
}>;

const TIERS: BudgetTier[] = ['budget', 'moderate', 'luxury'];

export default function BudgetPlanner() {
  const navigate = useNavigate();
  const [values, setValues] = useState<BudgetFormValues>(initialValues);
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFieldChange = (field: keyof BudgetFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdultsChange = (value: number) => {
    setAdults(Math.max(1, Math.min(10, value)));
  };

  const handleChildrenChange = (value: number) => {
    setChildren(Math.max(0, Math.min(10, value)));
  };

  const handleGenerate = useCallback(async () => {
    if (isLoading) return;

    if (!values.startPlace.trim() || !values.destinationPlace.trim()) {
      setErrorMsg('Please enter both a start place and a destination.');
      return;
    }
    if (!values.startDate || !values.endDate) {
      setErrorMsg('Please select both a start date and an end date.');
      return;
    }
    if (values.startDate >= values.endDate) {
      setErrorMsg('End date must be after start date.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const results = await Promise.all(
        TIERS.map((tier) =>
          generateBudgetPlan({
            ...values,
            budgetRange: tier,
            adults: Number(adults),
            children: Number(children),
          })
        )
      );

      const navigationState: BudgetResultsNavigationState = {
        values: { ...values },
        adults: Number(adults),
        children: Number(children),
        plans: { budget: results[0], moderate: results[1], luxury: results[2] },
        hasGenerated: true,
      };

      navigate('/budget-results', { state: navigationState });
    } catch (err) {
      console.error('[BudgetPlanner] generateBudgetPlan failed:', err);
      setErrorMsg('Could not generate the itinerary right now.');
    } finally {
      setIsLoading(false);
    }
  }, [adults, children, isLoading, navigate, values]);

  const totalTravellers = adults + children;

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <BudgetForm
          values={values}
          options={BUDGET_OPTIONS}
          onFieldChange={handleFieldChange}
          onBudgetSelect={(budgetRange) =>
            setValues((prev) => ({ ...prev, budgetRange }))
          }
          onGenerate={handleGenerate}
          isLoading={isLoading}
        />

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <Users className="h-4 w-4 text-[var(--accent)]" />
            Travellers
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
              Adults
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease adults"
                  onClick={() => handleAdultsChange(adults - 1)}
                  disabled={adults <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-semibold text-[var(--ink)]">
                  {adults}
                </span>
                <button
                  type="button"
                  aria-label="Increase adults"
                  onClick={() => handleAdultsChange(adults + 1)}
                  disabled={totalTravellers >= 10}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </label>

            <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
              Children
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease children"
                  onClick={() => handleChildrenChange(children - 1)}
                  disabled={children <= 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-semibold text-[var(--ink)]">
                  {children}
                </span>
                <button
                  type="button"
                  aria-label="Increase children"
                  onClick={() => handleChildrenChange(children + 1)}
                  disabled={totalTravellers >= 10}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </label>

            <div className="col-span-2 flex items-center sm:justify-end">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Total
                </p>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  {totalTravellers} {totalTravellers === 1 ? 'traveller' : 'travellers'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {errorMsg && (
          <p className="px-1 text-xs text-red-500">{errorMsg}</p>
        )}

        {isLoading && (
          <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--accent)]" />
            Generating your trip plans across all budget tiers...
          </section>
        )}

        {!isLoading && (
          <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
            Generate your trip plan to see a live itinerary with budget, transport, hotel, food, places, and activities.
          </section>
        )}
      </div>
    </div>
  );
}
