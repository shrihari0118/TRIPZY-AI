import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import BudgetCard from '../components/BudgetCard';
import BudgetForm, { BudgetFormValues } from '../components/BudgetForm';
import PersonalizeModal from '../components/PersonalizeModal';
import {
  BudgetPlanId,
  PlanCustomization,
  budgetPlans,
} from '../data/budgetPlans';

const initialValues: BudgetFormValues = {
  startPlace: '',
  destinationPlace: '',
  startDate: '',
  endDate: '',
  budgetRange: 'moderate',
};

export default function BudgetPlanner() {
  const [values, setValues] = useState<BudgetFormValues>(initialValues);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [customizations, setCustomizations] = useState<
    Partial<Record<BudgetPlanId, PlanCustomization>>
  >({});
  const [activePlanId, setActivePlanId] = useState<BudgetPlanId | null>(null);

  const budgetOptions = budgetPlans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    costRange: plan.costRange,
    description: plan.description,
  }));

  const resolvedPlans = useMemo(
    () =>
      budgetPlans.map((plan) => {
        const custom = customizations[plan.id];
        return {
          ...plan,
          transport: custom?.transport ?? plan.transport,
          accommodation: custom?.accommodation ?? plan.accommodation,
          food: custom?.food ?? plan.food,
          activities: custom?.activities ?? plan.activities,
        };
      }),
    [customizations]
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

  const handleGenerate = () => {
    setHasGenerated(true);
  };

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

  const startLabel = values.startPlace || 'Pune';
  const destinationLabel = values.destinationPlace || 'Jaipur';
  const dateLabel =
    values.startDate && values.endDate
      ? `${formatDate(values.startDate)} - ${formatDate(values.endDate)}`
      : 'Select dates to lock the itinerary';

  const selectedBudgetTitle =
    budgetPlans.find((plan) => plan.id === values.budgetRange)?.title ??
    'Moderate';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <BudgetForm
          values={values}
          options={budgetOptions}
          onFieldChange={handleFieldChange}
          onBudgetSelect={(range) =>
            setValues((prev) => ({ ...prev, budgetRange: range }))
          }
          onGenerate={handleGenerate}
        />

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
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Selected Budget
              </p>
              <p className="mt-1 font-semibold text-[var(--ink)]">
                {selectedBudgetTitle}
              </p>
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
