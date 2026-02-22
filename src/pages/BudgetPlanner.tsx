import { RefreshCw, Sparkles, Users } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import BudgetCard from '../components/BudgetCard';
import BudgetForm, { BudgetFormValues } from '../components/BudgetForm';
import PersonalizeModal from '../components/PersonalizeModal';
import {
  BudgetPlan,
  BudgetPlanId,
  PlanCustomization,
  budgetPlans as staticBudgetPlans,
} from '../data/budgetPlans';
import {
  generateBudgetPlan,
  refreshBudgetPlan,
} from '../api/budgetPlanner';

const initialValues: BudgetFormValues = {
  startPlace: '',
  destinationPlace: '',
  startDate: '',
  endDate: '',
  budgetRange: 'moderate',
};

// Default max values for each tier — matches TIER_LIMITS in BudgetForm.tsx
const TIER_DEFAULT_MAX: Record<BudgetFormValues['budgetRange'], number> = {
  budget: 5_000,
  moderate: 15_000,
  luxury: 50_000,
};

// Fixed min values for each tier — matches TIER_LIMITS in BudgetForm.tsx
const TIER_MIN: Record<BudgetFormValues['budgetRange'], number> = {
  budget: 3_000,
  moderate: 8_000,
  luxury: 20_000,
};

/** Format amount as Indian-locale INR string (e.g. ₹3,000) */
function formatINR(n: number): string {
  return `\u20b9${n.toLocaleString('en-IN')}`;
}

export default function BudgetPlanner() {
  const [values, setValues] = useState<BudgetFormValues>(initialValues);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [customizations, setCustomizations] = useState<
    Partial<Record<BudgetPlanId, PlanCustomization>>
  >({});
  const [activePlanId, setActivePlanId] = useState<BudgetPlanId | null>(null);

  // Max-budget slider state (mirrors selected tier's max by default)
  const [maxBudget, setMaxBudget] = useState<number>(TIER_DEFAULT_MAX[initialValues.budgetRange]);

  // Traveller count state (Step A)
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);

  // API-driven state
  const [plans, setPlans] = useState<BudgetPlan[]>(staticBudgetPlans);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Inline slider error — set when backend returns MAX_BUDGET_TOO_LOW
  const [sliderError, setSliderError] = useState<string | null>(null);

  const budgetOptions = plans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    costRange: plan.costRange,
    description: plan.description,
  }));

  const resolvedPlans = useMemo(
    () =>
      plans.map((plan) => {
        const custom = customizations[plan.id];
        return {
          ...plan,
          transport: custom?.transport ?? plan.transport,
          accommodation: custom?.accommodation ?? plan.accommodation,
          food: custom?.food ?? plan.food,
          activities: custom?.activities ?? plan.activities,
        };
      }),
    [plans, customizations]
  );

  const orderedPlans = useMemo(() => {
    if (!hasGenerated) {
      return resolvedPlans;
    }
    const selected = resolvedPlans.find(
      (plan) => plan.id === values.budgetRange
    );
    if (!selected) {
      return resolvedPlans;
    }
    const others = resolvedPlans.filter(
      (plan) => plan.id !== values.budgetRange
    );
    return [selected, ...others];
  }, [hasGenerated, resolvedPlans, values.budgetRange]);

  const activePlan = activePlanId
    ? resolvedPlans.find((plan) => plan.id === activePlanId) ?? null
    : null;

  const handleFieldChange = (
    field: keyof BudgetFormValues,
    value: string
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdultsChange = (value: number) => {
    const clamped = Math.max(1, Math.min(10, value));
    setAdults(clamped);
  };

  const handleChildrenChange = (value: number) => {
    const clamped = Math.max(0, Math.min(10, value));
    setChildren(clamped);
  };

  const handleGenerate = useCallback(async () => {
    if (isLoading) return;

    // ── Frontend guards ────────────────────────────────────────────────────
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
    setSliderError(null);

    try {
      const response = await generateBudgetPlan({
        ...values,
        adults: Number(adults),
        children: Number(children),
        maxBudget,
      });
      // ── Frontend override: for the selected tier, display the exact slider
      // values as costRange so the card always reflects the user's chosen limit.
      const patchedPlans = response.plans.map((plan) =>
        plan.id === values.budgetRange
          ? { ...plan, costRange: `${formatINR(TIER_MIN[values.budgetRange])} - ${formatINR(maxBudget)}` }
          : plan
      );
      setPlans(patchedPlans);
      setRequestId(response.requestId);
      setLastUpdatedAt(response.lastUpdatedAt);
    } catch (err) {
      console.error('[BudgetPlanner] generateBudgetPlan failed:', err);
      // Try to parse a structured backend error for MAX_BUDGET_TOO_LOW
      const errMsg = err instanceof Error ? err.message : String(err);
      const bodyStr = errMsg.includes('{') ? errMsg.slice(errMsg.indexOf('{')) : null;
      let parsed: { error?: { code?: string; message?: string } } | null = null;
      try { if (bodyStr) parsed = JSON.parse(bodyStr); } catch { /* not JSON */ }

      if (parsed?.error?.code === 'MAX_BUDGET_TOO_LOW') {
        // User-fixable: show inline slider error, leave current plans intact
        setSliderError(parsed.error.message ?? 'Max budget is too low for this tier.');
      } else {
        setErrorMsg('Could not reach the server — showing estimated plans.');
        setPlans(staticBudgetPlans);
      }
    } finally {
      setIsLoading(false);
      setHasGenerated(true);
    }
  }, [isLoading, values, adults, children, maxBudget]);

  const handleRefresh = useCallback(async () => {
    if (isLoading || !requestId) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSliderError(null);

    try {
      const response = await refreshBudgetPlan({
        requestId,
        ...values,
        adults: Number(adults),
        children: Number(children),
        maxBudget,
      });
      // ── Frontend override for selected tier (same logic as generate) ————————
      const patchedPlans = response.plans.map((plan) =>
        plan.id === values.budgetRange
          ? { ...plan, costRange: `${formatINR(TIER_MIN[values.budgetRange])} - ${formatINR(maxBudget)}` }
          : plan
      );
      // Update only plans and timestamp — customizations are preserved in state
      setPlans(patchedPlans);
      setLastUpdatedAt(response.lastUpdatedAt);
    } catch (err) {
      console.error('[BudgetPlanner] refreshBudgetPlan failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      const bodyStr = errMsg.includes('{') ? errMsg.slice(errMsg.indexOf('{')) : null;
      let parsed: { error?: { code?: string; message?: string } } | null = null;
      try { if (bodyStr) parsed = JSON.parse(bodyStr); } catch { /* not JSON */ }

      if (parsed?.error?.code === 'MAX_BUDGET_TOO_LOW') {
        setSliderError(parsed.error.message ?? 'Max budget is too low for this tier.');
      } else {
        setErrorMsg('Refresh failed — showing last known plans.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, requestId, values, adults, children, maxBudget]);

  // ── Debounced auto-regen removed: cards only update after clicking Generate ———
  // Slider state updates are purely local until the user explicitly generates.

  const handleSave = (custom: PlanCustomization) => {
    if (!activePlanId) {
      return;
    }
    setCustomizations((prev) => ({ ...prev, [activePlanId]: custom }));
    setActivePlanId(null);
  };

  const formatDate = (value: string) => {
    if (!value) {
      return '';
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatUpdatedAt = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const startLabel = values.startPlace || 'Pune';
  const destinationLabel = values.destinationPlace || 'Jaipur';
  const dateLabel =
    values.startDate && values.endDate
      ? `${formatDate(values.startDate)} - ${formatDate(values.endDate)}`
      : 'Select dates to lock the itinerary';

  const selectedBudgetTitle =
    plans.find((plan) => plan.id === values.budgetRange)?.title ??
    'Moderate';

  const totalTravellers = adults + children;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <BudgetForm
          values={values}
          options={budgetOptions}
          onFieldChange={handleFieldChange}
          onBudgetSelect={(range) => {
            setValues((prev) => ({ ...prev, budgetRange: range }));
            // Reset slider to the new tier's default maximum, and clear errors
            setMaxBudget(TIER_DEFAULT_MAX[range]);
            setSliderError(null);
          }}
          onGenerate={handleGenerate}
          isLoading={isLoading}
          maxBudget={maxBudget}
          onMaxBudgetChange={(v) => {
            setMaxBudget(v);
            setSliderError(null);   // Clear stale error while user is still adjusting
          }}
          sliderError={sliderError}
          generateDisabled={!!sliderError}
        />

        {/* ── Traveller Count Inputs (Step A) ───────────────────────────────── */}
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)] mb-5">
            <Users className="h-4 w-4 text-[var(--accent)]" />
            Travellers
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Adults */}
            <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
              Adults
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  aria-label="Decrease adults"
                  onClick={() => handleAdultsChange(adults - 1)}
                  disabled={adults <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span
                  className="w-6 text-center text-sm font-semibold text-[var(--ink)]"
                  aria-live="polite"
                >
                  {adults}
                </span>
                <button
                  type="button"
                  aria-label="Increase adults"
                  onClick={() => handleAdultsChange(adults + 1)}
                  disabled={totalTravellers >= 10}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-[var(--muted)]">min 1</p>
            </label>

            {/* Children */}
            <label className="space-y-2 text-sm font-medium text-[var(--ink)]">
              Children
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  aria-label="Decrease children"
                  onClick={() => handleChildrenChange(children - 1)}
                  disabled={children <= 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span
                  className="w-6 text-center text-sm font-semibold text-[var(--ink)]"
                  aria-live="polite"
                >
                  {children}
                </span>
                <button
                  type="button"
                  aria-label="Increase children"
                  onClick={() => handleChildrenChange(children + 1)}
                  disabled={totalTravellers >= 10}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-[var(--muted)]">discounted rate</p>
            </label>

            {/* Summary pill */}
            <div className="col-span-2 flex items-center sm:justify-end">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Total
                </p>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  {totalTravellers} {totalTravellers === 1 ? 'traveller' : 'travellers'}
                </p>
                {totalTravellers >= 10 && (
                  <p className="mt-0.5 text-xs text-amber-500">Group cap reached</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Non-intrusive error message */}
        {errorMsg && (
          <p className="text-xs text-red-500 -mt-4 px-1">{errorMsg}</p>
        )}

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                Trip Summary
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                {startLabel} to {destinationLabel}
              </h2>
              <p className="text-sm text-[var(--muted)]">{dateLabel}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Selected Budget
                </p>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  {selectedBudgetTitle}
                </p>
              </div>
              {hasGenerated && requestId && (
                <div className="flex items-center gap-2">
                  {lastUpdatedAt && (
                    <span className="text-xs text-[var(--muted)]">
                      Updated {formatUpdatedAt(lastUpdatedAt)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--accent-soft)] hover:text-[var(--ink)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Availability
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {hasGenerated ? (
          <section className="grid gap-6 lg:grid-cols-3">
            {orderedPlans.map((plan, index) => (
              <div
                key={plan.id}
                className="animate-slide-fade"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <BudgetCard
                  plan={plan}
                  isSelected={plan.id === values.budgetRange}
                  onPersonalize={() => setActivePlanId(plan.id)}
                  ratios={customizations[plan.id]?.ratios}
                />
              </div>
            ))}
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
            Generate your trip plan to see three budget-ready options appear
            here.
          </section>
        )}
      </div>

      <PersonalizeModal
        isOpen={Boolean(activePlanId)}
        plan={activePlan}
        onClose={() => setActivePlanId(null)}
        onSave={handleSave}
      />
    </div>
  );
}
