import type { TransportSeat } from '../../api/budgetPlanner';
import { formatInr } from '../../utils/pricingUtils';

type SeatProps = {
  seat: TransportSeat;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (seatId: string) => void;
};

const SEAT_TYPE_STYLES: Record<string, string> = {
  sleeper: 'border-sky-200 bg-sky-50 text-sky-950',
  'semi-sleeper': 'border-emerald-200 bg-emerald-50 text-emerald-950',
  seater: 'border-amber-200 bg-amber-50 text-amber-950',
};

export default function Seat({ seat, isSelected, isDisabled, onToggle }: SeatProps) {
  const seatStyle = SEAT_TYPE_STYLES[seat.type] ?? 'border-slate-200 bg-white text-slate-900';
  const buttonStateClass = seat.isBooked
    ? 'border-slate-200 bg-slate-100 text-slate-400'
    : isSelected
      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)] ring-2 ring-[var(--accent)]/20'
      : `${seatStyle} hover:-translate-y-0.5 hover:shadow-sm`;

  return (
    <button
      type="button"
      onClick={() => onToggle(seat.id)}
      disabled={isDisabled}
      className={`flex min-h-[90px] flex-col justify-between rounded-2xl border px-3 py-3 text-left transition ${buttonStateClass} ${isDisabled && !isSelected && !seat.isBooked ? 'cursor-not-allowed opacity-55' : ''}`}
      aria-pressed={isSelected}
      aria-label={`${seat.id} ${seat.type} ${seat.isBooked ? 'booked' : isSelected ? 'selected' : 'available'} for ${formatInr(seat.price)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold">{seat.id}</span>
        <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
          {seat.isBooked ? 'Booked' : seat.type}
        </span>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.18em] opacity-70">Seat Price</p>
        <p className="mt-1 text-sm font-semibold">{formatInr(seat.price)}</p>
      </div>
    </button>
  );
}
