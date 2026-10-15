import type { BudgetGenerateResponse, TotalBudget } from '../api/budgetPlanner';
import type { TripPaymentState } from '../api/payment';

const SELECTED_TRIP_STORAGE_KEY = 'tripzy:selected-trip';
const TRANSPORT_SELECTION_STORAGE_PREFIX = 'tripzy:transport-selection:';

export type StoredTransportSelection = {
  seatIds: string[];
  fareType: string | null;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

function normalizeAmount(value: unknown, fallback = 0): number {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return fallback;
  }

  return Math.max(0, amount);
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getBudgetEstimate(totalBudget: TotalBudget | undefined): number {
  if (!totalBudget) {
    return 0;
  }

  const minimum = Math.max(0, totalBudget.min ?? 0);
  const maximum = Math.max(minimum, totalBudget.max ?? minimum);

  if (minimum > 0 && maximum > 0) {
    return Math.round((minimum + maximum) / 2);
  }

  return Math.round(Math.max(minimum, maximum, 0));
}

export function createDefaultTripPaymentState(
  trip: BudgetGenerateResponse | null
): TripPaymentState {
  return {
    totalAmount: getBudgetEstimate(trip?.result.total_budget),
    transportAmount: 0,
    paid: {
      transport: false,
      full: false,
    },
  };
}

export function mergeTripPaymentState(
  trip: BudgetGenerateResponse | null,
  candidate: unknown
): TripPaymentState {
  const defaults = createDefaultTripPaymentState(trip);
  if (!candidate || typeof candidate !== 'object') {
    return defaults;
  }

  const next = candidate as Partial<TripPaymentState> & {
    paid?: Partial<TripPaymentState['paid']>;
  };
  const totalAmount = normalizeAmount(next.totalAmount, defaults.totalAmount);

  return {
    totalAmount: totalAmount > 0 ? totalAmount : defaults.totalAmount,
    transportAmount: Math.min(
      normalizeAmount(next.transportAmount, defaults.transportAmount),
      totalAmount > 0 ? totalAmount : defaults.totalAmount || Number.MAX_SAFE_INTEGER
    ),
    paid: {
      transport: Boolean(next.paid?.transport),
      full: Boolean(next.paid?.full),
    },
  };
}

export function getRemainingTripPayableAmount(
  paymentState: TripPaymentState | null | undefined
): number {
  if (!paymentState || paymentState.paid.full) {
    return 0;
  }

  const deductedTransport = paymentState.paid.transport ? paymentState.transportAmount : 0;
  return Math.max(0, paymentState.totalAmount - deductedTransport);
}

export function readStoredSelectedTrip(): BudgetGenerateResponse | null {
  if (!canUseStorage()) {
    return null;
  }

  return parseJson<BudgetGenerateResponse>(localStorage.getItem(SELECTED_TRIP_STORAGE_KEY));
}

export function writeStoredSelectedTrip(trip: BudgetGenerateResponse | null): void {
  if (!canUseStorage()) {
    return;
  }

  if (!trip) {
    localStorage.removeItem(SELECTED_TRIP_STORAGE_KEY);
    return;
  }

  localStorage.setItem(SELECTED_TRIP_STORAGE_KEY, JSON.stringify(trip));
}

export function readStoredTransportSelection(
  tripId: string | undefined
): StoredTransportSelection | null {
  if (!canUseStorage() || !tripId) {
    return null;
  }

  return parseJson<StoredTransportSelection>(
    localStorage.getItem(`${TRANSPORT_SELECTION_STORAGE_PREFIX}${tripId}`)
  );
}

export function writeStoredTransportSelection(
  tripId: string | undefined,
  selection: StoredTransportSelection
): void {
  if (!canUseStorage() || !tripId) {
    return;
  }

  localStorage.setItem(
    `${TRANSPORT_SELECTION_STORAGE_PREFIX}${tripId}`,
    JSON.stringify(selection)
  );
}

export function clearStoredTransportSelection(tripId: string | undefined): void {
  if (!canUseStorage() || !tripId) {
    return;
  }

  localStorage.removeItem(`${TRANSPORT_SELECTION_STORAGE_PREFIX}${tripId}`);
}
