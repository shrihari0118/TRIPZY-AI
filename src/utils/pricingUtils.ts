import type { FareOption, TransportMode, TransportSeat } from '../api/budgetPlanner';

type CalculateTotalPriceInput = {
  mode: TransportMode;
  selectedSeats: TransportSeat[];
  selectedFare: FareOption | null;
  travellersCount: number;
};

export function calculateSeatTotal(selectedSeats: TransportSeat[]): number {
  return selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
}

export function getRecommendedFareOption(fareOptions: FareOption[]): FareOption | null {
  const availableOptions = fareOptions.filter((option) => option.availability !== 'Not Available');

  if (availableOptions.length === 0) {
    return fareOptions[0] ?? null;
  }

  return [...availableOptions].sort((left, right) => left.price - right.price)[0] ?? null;
}

export function calculateTotalPrice({
  mode,
  selectedSeats,
  selectedFare,
  travellersCount,
}: CalculateTotalPriceInput): number {
  if (mode === 'bus') {
    return calculateSeatTotal(selectedSeats);
  }

  if (!selectedFare) {
    return 0;
  }

  return selectedFare.price * Math.max(1, travellersCount);
}

export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}
