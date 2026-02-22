/**
 * BudgetAllocationSliders.tsx
 *
 * Lets the user split their total budget across four categories:
 *   Transportation | Accommodation | Food | Activities
 *
 * Rules:
 *  • All four ratios always sum to exactly 100 %.
 *  • Changing one slider redistributes the remainder evenly across the others.
 *  • Displayed alongside computed INR amounts derived from `totalMidpoint`.
 *  • Shows "AI Recommended Allocation" / "Customized Allocation" badge.
 */

import { BudgetPlanId } from '../data/budgetPlans';

// ── Types ──────────────────────────────────────────────────────────────────────

export type AllocationRatios = {
    transport: number;      // 0–100 (integer %, multiple of 5)
    accommodation: number;
    food: number;
    activities: number;
};

// ── Default AI Ratios per tier ─────────────────────────────────────────────────

export const DEFAULT_RATIOS: Record<BudgetPlanId, AllocationRatios> = {
    budget: { transport: 25, accommodation: 35, food: 30, activities: 10 },
    moderate: { transport: 20, accommodation: 40, food: 25, activities: 15 },
    luxury: { transport: 15, accommodation: 45, food: 20, activities: 20 },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns true when ratios equal the defaults for the given tier. */
export function isDefaultRatio(ratios: AllocationRatios, tier: BudgetPlanId): boolean {
    const def = DEFAULT_RATIOS[tier];
    return (
        ratios.transport === def.transport &&
        ratios.accommodation === def.accommodation &&
        ratios.food === def.food &&
        ratios.activities === def.activities
    );
}

/** Parse min value from a costRange string like "₹3,000 - ₹4,500". */
export function parseMidpoint(costRange: string): number {
    const nums = costRange.replace(/₹/g, '').split('-').map((s) => Number(s.replace(/,/g, '').trim()));
    if (nums.length === 2 && !isNaN(nums[0]) && !isNaN(nums[1])) {
        return Math.round((nums[0] + nums[1]) / 2);
    }
    return nums[0] || 0;
}

/** Format a number to INR string. */
function formatINR(n: number): string {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/**
 * Rebalance ratios after one slider changes.
 * Strategy: clamp the changed key to [0,100] stepped to 5, then
 * distribute the remaining % across the other three keys proportionally
 * (if all others are 0, split equally). Always sums to 100.
 */
export function rebalanceRatios(
    current: AllocationRatios,
    changedKey: keyof AllocationRatios,
    rawValue: number,
): AllocationRatios {
    // Step to nearest 5, clamp to [0, 100]
    const newVal = Math.min(100, Math.max(0, Math.round(rawValue / 5) * 5));
    const remainder = 100 - newVal;

    const others = (Object.keys(current) as (keyof AllocationRatios)[]).filter(
        (k) => k !== changedKey,
    );
    const sumOthers = others.reduce((s, k) => s + current[k], 0);

    const next: AllocationRatios = { ...current, [changedKey]: newVal };

    if (sumOthers === 0) {
        // All others are 0 → split equally in multiples of 5
        const share = Math.floor(remainder / others.length / 5) * 5;
        let leftover = remainder;
        others.forEach((k, i) => {
            const v = i === others.length - 1 ? leftover : share;
            next[k] = Math.max(0, v);
            leftover -= share;
        });
    } else {
        // Distribute proportionally
        let assigned = 0;
        others.forEach((k, i) => {
            if (i === others.length - 1) {
                next[k] = Math.max(0, remainder - assigned);
            } else {
                const share = Math.round((current[k] / sumOthers) * remainder / 5) * 5;
                next[k] = Math.max(0, share);
                assigned += share;
            }
        });
    }

    // Final safety: make sure sum is exactly 100
    const total = (Object.keys(next) as (keyof AllocationRatios)[]).reduce((s, k) => s + next[k], 0);
    if (total !== 100) {
        // Adjust last "other" key to absorb any rounding gaps
        const lastOther = others[others.length - 1];
        next[lastOther] = Math.max(0, next[lastOther] + (100 - total));
    }

    return next;
}

// ── Component ──────────────────────────────────────────────────────────────────

type SliderRowProps = {
    label: string;
    icon: string;
    fieldKey: keyof AllocationRatios;
    ratios: AllocationRatios;
    midpoint: number;
    onChange: (key: keyof AllocationRatios, value: number) => void;
};

function SliderRow({ label, icon, fieldKey, ratios, midpoint, onChange }: SliderRowProps) {
    const pct = ratios[fieldKey];
    const amount = Math.round(midpoint * pct / 100);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--ink)]">
                    {icon} {label}
                </span>
                <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-strong)] tabular-nums">
                        {pct}%
                    </span>
                    <span className="text-xs text-[var(--muted)] tabular-nums">
                        {formatINR(amount)}
                    </span>
                </div>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={pct}
                aria-label={`${label} allocation ${pct}%`}
                aria-valuenow={pct}
                onChange={(e) => onChange(fieldKey, Number(e.target.value))}
                className="alloc-slider w-full"
            />
        </div>
    );
}

type BudgetAllocationSlidersProps = {
    tier: BudgetPlanId;
    costRange: string;           // e.g. "₹3,000 - ₹4,500"
    ratios: AllocationRatios;
    onChange: (ratios: AllocationRatios) => void;
};

export default function BudgetAllocationSliders({
    tier,
    costRange,
    ratios,
    onChange,
}: BudgetAllocationSlidersProps) {
    const midpoint = parseMidpoint(costRange);
    const isDefault = isDefaultRatio(ratios, tier);

    const handleChange = (key: keyof AllocationRatios, value: number) => {
        onChange(rebalanceRatios(ratios, key, value));
    };

    return (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-5 py-4">
            {/* ── Header ──────────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                    Budget Allocation
                </p>
                <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isDefault
                            ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                >
                    {isDefault ? '✦ AI Recommended Allocation' : '✎ Customized Allocation'}
                </span>
            </div>

            {/* ── Sliders ─────────────────────────────────────────────────────────── */}
            <div className="space-y-4">
                <SliderRow label="Transportation" icon="🚆" fieldKey="transport" ratios={ratios} midpoint={midpoint} onChange={handleChange} />
                <SliderRow label="Accommodation" icon="🏨" fieldKey="accommodation" ratios={ratios} midpoint={midpoint} onChange={handleChange} />
                <SliderRow label="Food" icon="🍽️" fieldKey="food" ratios={ratios} midpoint={midpoint} onChange={handleChange} />
                <SliderRow label="Activities" icon="🎯" fieldKey="activities" ratios={ratios} midpoint={midpoint} onChange={handleChange} />
            </div>

            {/* ── Total check ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
                <span className="text-[var(--muted)]">Total</span>
                <span className="font-semibold text-[var(--ink)]">
                    {formatINR(midpoint)} (midpoint estimate)
                </span>
            </div>

            {/* ── Scoped slider styles ─────────────────────────────────────────────── */}
            <style>{`
        .alloc-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 5px;
          border-radius: 9999px;
          background: var(--border, #e2e8f0);
          outline: none;
          cursor: pointer;
        }
        .alloc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: var(--accent, #6366f1);
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.12s ease;
        }
        .alloc-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: var(--accent, #6366f1);
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.12s ease;
        }
        .alloc-slider:hover::-webkit-slider-thumb,
        .alloc-slider:focus::-webkit-slider-thumb {
          transform: scale(1.18);
        }
        .alloc-slider:hover::-moz-range-thumb,
        .alloc-slider:focus::-moz-range-thumb {
          transform: scale(1.18);
        }
        .alloc-slider::-moz-range-progress {
          height: 5px;
          border-radius: 9999px;
          background: var(--accent, #6366f1);
        }
      `}</style>
        </div>
    );
}
