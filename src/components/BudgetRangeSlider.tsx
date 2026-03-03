/**
 * BudgetRangeSlider.tsx
 * A single-handle range slider that lets the user control the maximum budget
 * within a tier's allowed range. The minimum is fixed and read-only.
 *
 * Props:
 *   tierMin   – fixed lower bound for this tier (not adjustable)
 *   tierMax   – fixed upper bound for this tier (slider ceiling)
 *   value     – current max value (controlled)
 *   onChange  – called with new max value on every slider move
 *   disabled  – when true the slider is greyed out and non-interactive
 */

const STEP = 100; // ₹100 increments

type BudgetRangeSliderProps = {
  tierMin: number;
  tierMax: number;
  value: number;
  onChange: (newMax: number) => void;
  disabled?: boolean;
  /** Inline error message (e.g. from MAX_BUDGET_TOO_LOW). Replaces the helper text. */
  error?: string | null;
};

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function BudgetRangeSlider({
  tierMin,
  tierMax,
  value,
  onChange,
  disabled = false,
  error = null,
}: BudgetRangeSliderProps) {
  // Percentage for the filled track (left side of thumb)
  const fillPercent =
    tierMax === tierMin
      ? 100
      : Math.round(((value - tierMin) / (tierMax - tierMin)) * 100);

  return (
    <div
      className={`space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-5 py-4 transition-opacity ${disabled ? 'opacity-40 pointer-events-none select-none' : ''
        }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
          Max Budget
        </span>
        <span
          className="rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent-strong)] tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {formatINR(value)}
        </span>
      </div>

      {/* ── Slider track + thumb ────────────────────────────────────────── */}
      <div className="relative flex items-center">
        {/* Filled track behind the native input */}
        <div
          className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-[var(--accent)]"
          style={{ width: `${fillPercent}%` }}
          aria-hidden="true"
        />

        <input
          type="range"
          min={tierMin}
          max={tierMax}
          step={STEP}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Maximum budget"
          aria-valuemin={tierMin}
          aria-valuemax={tierMax}
          aria-valuenow={value}
          className="budget-slider w-full"
        />
      </div>

      {/* ── Min / Max labels ────────────────────────────────────────────── */}
      <div className="flex justify-between text-xs text-[var(--muted)]">
        <span>
          Min:{' '}
          <span className="font-medium text-[var(--ink)]">
            {formatINR(tierMin)}
          </span>
        </span>
        <span>
          Max:{' '}
          <span className="font-medium text-[var(--ink)]">
            {formatINR(tierMax)}
          </span>
        </span>
      </div>

      {/* ── Helper / error text ────────────────────────────────────── */}
      {error ? (
        <p className="text-xs font-medium text-red-500" role="alert" aria-live="polite">
          {error}
        </p>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          AI recommendations will be generated within your selected budget limit.
        </p>
      )}

      {/* ── Scoped slider styles ────────────────────────────────────────── */}
      <style>{`
        .budget-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: transparent;
          outline: none;
          cursor: pointer;
          position: relative;
          z-index: 1;
        }

        /* Unfilled track (both engines) */
        .budget-slider::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 9999px;
          background: var(--border, #e2e8f0);
        }
        .budget-slider::-moz-range-track {
          height: 6px;
          border-radius: 9999px;
          background: var(--border, #e2e8f0);
        }

        /* Filled portion (Firefox only — Webkit filled via the overlay div) */
        .budget-slider::-moz-range-progress {
          height: 6px;
          border-radius: 9999px;
          background: var(--accent, #6366f1);
        }

        /* Thumb */
        .budget-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: var(--accent, #6366f1);
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
          cursor: pointer;
          margin-top: -7px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .budget-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: var(--accent, #6366f1);
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        /* Thumb hover / active states */
        .budget-slider:hover::-webkit-slider-thumb,
        .budget-slider:focus::-webkit-slider-thumb {
          transform: scale(1.15);
          box-shadow: 0 0 0 4px var(--accent-soft, rgba(99,102,241,0.15)), 0 1px 4px rgba(0,0,0,0.18);
        }
        .budget-slider:hover::-moz-range-thumb,
        .budget-slider:focus::-moz-range-thumb {
          transform: scale(1.15);
          box-shadow: 0 0 0 4px var(--accent-soft, rgba(99,102,241,0.15)), 0 1px 4px rgba(0,0,0,0.18);
        }

        .budget-slider:focus-visible {
          outline: 2px solid var(--accent, #6366f1);
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
