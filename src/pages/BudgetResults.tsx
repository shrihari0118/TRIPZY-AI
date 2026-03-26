import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import BudgetCard from '../components/BudgetCard';
import { type BudgetFormValues } from '../components/BudgetForm';
import PersonalizeModal, { type PersonalizeSaveValues } from '../components/PersonalizeModal';
import {
  generateBudgetPlan,
  type BudgetGenerateResponse,
  type BudgetTier,
} from '../api/budgetPlanner';

export type BudgetResultsNavigationState = {
  values: BudgetFormValues;
  adults: number;
  children: number;
  plans: Record<BudgetTier, BudgetGenerateResponse | null>;
  hasGenerated: boolean;
};

const TIER_META: Record<BudgetTier, string> = {
  budget: 'Budget-Friendly',
  moderate: 'Moderate',
  luxury: 'Luxury',
};

const TIERS: BudgetTier[] = ['budget', 'moderate', 'luxury'];

const EMPTY_PLANS: Record<BudgetTier, BudgetGenerateResponse | null> = {
  budget: null,
  moderate: null,
  luxury: null,
};

export default function BudgetResults() {
  const location = useLocation();
  const navigationState = location.state as BudgetResultsNavigationState | null;

  const [plans, setPlans] = useState<Record<BudgetTier, BudgetGenerateResponse | null>>(
    navigationState?.plans ?? EMPTY_PLANS
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [personalizeTier, setPersonalizeTier] = useState<BudgetTier | null>(null);

  const values = navigationState?.values ?? null;
  const adults = navigationState?.adults ?? 1;
  const children = navigationState?.children ?? 0;
  const hasPlans = navigationState?.hasGenerated && (plans.budget || plans.moderate || plans.luxury);

  const handleRefresh = async () => {
    if (!values || isLoading) return;

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
      setPlans({ budget: results[0], moderate: results[1], luxury: results[2] });
    } catch (err) {
      console.error('[BudgetResults] refreshBudgetPlan failed:', err);
      setErrorMsg('Refresh failed. Showing the latest itinerary already loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonalize = (tier: BudgetTier) => {
    setPersonalizeTier(tier);
  };

  const handlePersonalizeClose = () => {
    setPersonalizeTier(null);
  };

  const handlePersonalizeSave = (tier: BudgetTier, saved: PersonalizeSaveValues) => {
    setPlans((prev) => {
      const existing = prev[tier];
      if (!existing) return prev;

      return {
        ...prev,
        [tier]: {
          ...existing,
          result: {
            ...existing.result,
            activities: saved.activities,
          },
        },
      };
    });
    setPersonalizeTier(null);
  };

  if (!values || !navigationState?.hasGenerated) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
            No trip data available. Please generate a plan first.
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {errorMsg && (
          <p className="px-1 text-xs text-red-500">{errorMsg}</p>
        )}

        {isLoading && (
          <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--accent)]" />
            Generating your trip plans across all budget tiers...
          </section>
        )}

        {hasPlans && !isLoading ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--ink)]">
                Your Trip Plans
              </h2>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh Plans
              </button>
            </div>

            <section className="grid gap-6 md:grid-cols-3">
              {TIERS.map((tier) => {
                const plan = plans[tier];
                if (!plan) return null;

                return (
                  <BudgetCard
                    key={tier}
                    trip={plan}
                    tier={tier}
                    title={TIER_META[tier]}
                    result={plan.result}
                    isSelected={values.budgetRange === tier}
                    onPersonalize={() => handlePersonalize(tier)}
                  />
                );
              })}
            </section>
          </>
        ) : (
          !isLoading && (
            <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
              No trip data available. Please generate a plan first.
            </section>
          )
        )}

        <PersonalizeModal
          isOpen={personalizeTier !== null}
          tier={personalizeTier}
          title={personalizeTier ? TIER_META[personalizeTier] : ''}
          result={personalizeTier ? plans[personalizeTier]?.result ?? null : null}
          onClose={handlePersonalizeClose}
          onSave={(saved) => {
            if (personalizeTier) handlePersonalizeSave(personalizeTier, saved);
          }}
        />
      </div>
    </div>
  );
}
