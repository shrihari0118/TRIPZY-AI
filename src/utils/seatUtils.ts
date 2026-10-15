import type { TransportSeat } from '../api/budgetPlanner';

export function toggleSeatSelection(
  currentSeats: TransportSeat[],
  seat: TransportSeat,
  maxSelection: number
): TransportSeat[] {
  if (seat.isBooked) {
    return currentSeats;
  }

  const isSelected = currentSeats.some((item) => item.id === seat.id);
  if (isSelected) {
    return currentSeats.filter((item) => item.id !== seat.id);
  }

  if (currentSeats.length >= Math.max(1, maxSelection)) {
    return currentSeats;
  }

  return [...currentSeats, seat];
}

export function getSeatPositionKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function createSeatPositionMap(seats: TransportSeat[]): Record<string, TransportSeat> {
  return seats.reduce<Record<string, TransportSeat>>((map, seat) => {
    map[getSeatPositionKey(seat.row, seat.col)] = seat;
    return map;
  }, {});
}

export function isSeatSelectionDisabled(
  seat: TransportSeat,
  selectedSeatIds: Set<string>,
  maxSelection: number
): boolean {
  return (
    seat.isBooked ||
    (selectedSeatIds.size >= Math.max(1, maxSelection) && !selectedSeatIds.has(seat.id))
  );
}
