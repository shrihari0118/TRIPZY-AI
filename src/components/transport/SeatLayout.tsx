import type { TransportSeat, TransportSeatLayout } from '../../api/budgetPlanner';
import { createSeatPositionMap, getSeatPositionKey, isSeatSelectionDisabled } from '../../utils/seatUtils';
import Seat from './Seat';

type SeatLayoutProps = {
  seatLayout: TransportSeatLayout;
  seats: TransportSeat[];
  selectedSeats: TransportSeat[];
  selectionLimit: number;
  isLocked?: boolean;
  onToggleSeat: (seatId: string) => void;
};

const LEGEND_ITEMS = [
  { label: 'Sleeper', className: 'border-sky-200 bg-sky-50 text-sky-950' },
  { label: 'Semi-sleeper', className: 'border-emerald-200 bg-emerald-50 text-emerald-950' },
  { label: 'Seater', className: 'border-amber-200 bg-amber-50 text-amber-950' },
  { label: 'Selected', className: 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]' },
  { label: 'Booked', className: 'border-slate-200 bg-slate-100 text-slate-400' },
] as const;

export default function SeatLayout({
  seatLayout,
  seats,
  selectedSeats,
  selectionLimit,
  isLocked = false,
  onToggleSeat,
}: SeatLayoutProps) {
  if (seatLayout.rows < 1 || seatLayout.cols < 1 || seats.length === 0) {
    return (
      <section className="mt-6 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-6 text-sm text-[var(--muted)]">
        Seat layout is not available for this service.
      </section>
    );
  }

  const seatMap = createSeatPositionMap(seats);
  const selectedSeatIds = new Set(selectedSeats.map((seat) => seat.id));
  const rows = Array.from({ length: seatLayout.rows }, (_, index) => index + 1);
  const cols = Array.from({ length: seatLayout.cols }, (_, index) => index + 1);

  return (
    <section className="mt-6 space-y-5">
      <div className="flex flex-wrap gap-2">
        {LEGEND_ITEMS.map((item) => (
          <span
            key={item.label}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.className}`}
          >
            {item.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[320px] rounded-[28px] border border-[var(--border)] bg-[var(--panel-muted)]/80 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            <span>Driver Cabin</span>
            <span>Select up to {selectionLimit}</span>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `2.5rem repeat(${seatLayout.cols}, minmax(0, 1fr))` }}
          >
            {rows.map((row) => (
              <div key={row} className="contents">
                <div className="flex items-center justify-center rounded-2xl bg-white/70 text-xs font-semibold text-[var(--muted)]">
                  {row}
                </div>

                {cols.map((col) => {
                  const seat = seatMap[getSeatPositionKey(row, col)];

                  if (!seat) {
                    return (
                      <div
                        key={`${row}-${col}`}
                        className="min-h-[90px] rounded-2xl border border-dashed border-white/70 bg-white/30"
                        aria-hidden="true"
                      />
                    );
                  }

                  return (
                    <Seat
                      key={seat.id}
                      seat={seat}
                      isSelected={selectedSeatIds.has(seat.id)}
                      isDisabled={
                        isLocked || isSeatSelectionDisabled(seat, selectedSeatIds, selectionLimit)
                      }
                      onToggle={onToggleSeat}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
