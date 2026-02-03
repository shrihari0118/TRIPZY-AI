import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BudgetPlan, PlanCustomization } from '../data/budgetPlans';

type PersonalizeModalProps = {
  isOpen: boolean;
  plan: BudgetPlan | null;
  onClose: () => void;
  onSave: (values: PlanCustomization) => void;
};

export default function PersonalizeModal({
  isOpen,
  plan,
  onClose,
  onSave,
}: PersonalizeModalProps) {
  const [transport, setTransport] = useState('');
  const [accommodation, setAccommodation] = useState('');
  const [food, setFood] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [activityInput, setActivityInput] = useState('');

  useEffect(() => {
    if (!plan) {
      return;
    }
    setTransport(plan.transport);
    setAccommodation(plan.accommodation);
    setFood(plan.food);
    setActivities(plan.activities);
    setActivityInput('');
  }, [plan]);

  const activityOptions = useMemo(() => {
    if (!plan) {
      return [];
    }
    return Array.from(new Set([...plan.options.activities, ...activities]));
  }, [plan, activities]);

  if (!isOpen || !plan) {
    return null;
  }

  const toggleActivity = (activity: string) => {
    setActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((item) => item !== activity)
        : [...prev, activity]
    );
  };

  const handleAddActivity = () => {
    const trimmed = activityInput.trim();
    if (!trimmed) {
      return;
    }
    setActivities((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setActivityInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
      <div className="relative h-full w-full max-w-md bg-[var(--panel)] shadow-2xl animate-slide-fade">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Personalize Plan
            </p>
            <h2 className="text-lg font-semibold text-[var(--ink)]">
              {plan.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[var(--border)] p-2 text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-6">
          <div className="space-y-2 text-sm">
            <label className="font-semibold text-[var(--ink)]">
              Transport Type
            </label>
            <select
              value={transport}
              onChange={(event) => setTransport(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              {plan.options.transport.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 text-sm">
            <label className="font-semibold text-[var(--ink)]">
              Hotel Type
            </label>
            <select
              value={accommodation}
              onChange={(event) => setAccommodation(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              {plan.options.accommodation.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 text-sm">
            <label className="font-semibold text-[var(--ink)]">
              Food Preference
            </label>
            <select
              value={food}
              onChange={(event) => setFood(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              {plan.options.food.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 text-sm">
            <label className="font-semibold text-[var(--ink)]">
              Activities &amp; Experiences
            </label>
            <div className="grid gap-2">
              {activityOptions.map((activity) => (
                <label
                  key={activity}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={activities.includes(activity)}
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
                onChange={(event) => setActivityInput(event.target.value)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
              <button
                onClick={handleAddActivity}
                className="rounded-xl border border-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {activities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activities.map((activity) => (
                  <button
                    key={activity}
                    onClick={() => toggleActivity(activity)}
                    className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
                  >
                    {activity} x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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
                  transport,
                  accommodation,
                  food,
                  activities,
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
