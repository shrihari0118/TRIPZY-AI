import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type {
  BudgetGenerateResponse,
  FareOption,
  TransportMode,
  TransportSeat,
  TransportSeatLayout,
  TransportTimelinePoint,
} from '../api/budgetPlanner';
import type { PaymentStatus, TripPaymentState } from '../api/payment';
import { calculateTotalPrice as calculateTransportTotal, getRecommendedFareOption } from '../utils/pricingUtils';
import {
  clearStoredTransportSelection,
  createDefaultTripPaymentState,
  getBudgetEstimate,
  mergeTripPaymentState,
  readStoredSelectedTrip,
  readStoredTransportSelection,
  writeStoredSelectedTrip,
  writeStoredTransportSelection,
} from '../utils/tripPayment';
import { toggleSeatSelection } from '../utils/seatUtils';

const TIME_SLOTS: Record<TransportMode, string[]> = {
  bus: ['06:30 AM', '01:15 PM', '09:45 PM'],
  train: ['05:40 AM', '12:20 PM', '08:55 PM'],
  flight: ['07:10 AM', '02:35 PM', '07:50 PM'],
};

export type TransportTimelineItem = TransportTimelinePoint & {
  kind: 'boarding' | 'stop' | 'dropping';
};

export type TransportItinerary = {
  mode: TransportMode;
  timeSlots: string[];
  seatLayout: TransportSeatLayout;
  seats: TransportSeat[];
  fareOptions: FareOption[];
  boardingPoints: TransportTimelinePoint[];
  intermediateStops: TransportTimelinePoint[];
  droppingPoints: TransportTimelinePoint[];
  timeline: TransportTimelineItem[];
};

type TripContextValue = {
  selectedTrip: BudgetGenerateResponse | null;
  setSelectedTrip: (trip: BudgetGenerateResponse | null) => void;
  transportItinerary: TransportItinerary | null;
  selectedSeats: TransportSeat[];
  selectedFare: FareOption | null;
  travellersCount: number;
  selectionLimit: number;
  toggleSeat: (seatId: string) => void;
  selectFare: (fareType: string) => void;
  calculateTotalPrice: () => number;
  setItinerary: (itinerary: TransportItinerary | null) => void;
  paymentState: TripPaymentState;
  setPaymentState: Dispatch<SetStateAction<TripPaymentState>>;
  fullPaymentStatus: PaymentStatus;
  setFullPaymentStatus: Dispatch<SetStateAction<PaymentStatus>>;
  transportPaymentStatus: PaymentStatus;
  setTransportPaymentStatus: Dispatch<SetStateAction<PaymentStatus>>;
  isTransportLocked: boolean;
  showTransportPaidOverlay: boolean;
  setShowTransportPaidOverlay: Dispatch<SetStateAction<boolean>>;
};

const TripContext = createContext<TripContextValue | undefined>(undefined);

function paymentStatesMatch(left: TripPaymentState, right: TripPaymentState): boolean {
  return (
    left.totalAmount === right.totalAmount &&
    left.transportAmount === right.transportAmount &&
    left.paid.transport === right.paid.transport &&
    left.paid.full === right.paid.full
  );
}

// Current flow analysis (2026-04-13):
// - BudgetCard stores the chosen trip in this context and every itinerary page reads it from here.
// - The transport amount is derived locally from seat selection (bus) or fare selection (train/flight).
// - Full payment state used to be a single status flag; this provider now keeps totalAmount,
//   transportAmount, and paid flags together so both payment paths share one source of truth.
export function TripProvider({ children }: { children: ReactNode }) {
  const [selectedTrip, setSelectedTrip] = useState<BudgetGenerateResponse | null>(() =>
    readStoredSelectedTrip()
  );
  const [transportItinerary, setTransportItinerary] = useState<TransportItinerary | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<TransportSeat[]>([]);
  const [selectedFare, setSelectedFare] = useState<FareOption | null>(null);
  const [paymentState, setPaymentState] = useState<TripPaymentState>(() => {
    const storedTrip = readStoredSelectedTrip();
    return mergeTripPaymentState(storedTrip, storedTrip?.payment);
  });
  const [fullPaymentStatus, setFullPaymentStatus] = useState<PaymentStatus>(() => {
    const storedTrip = readStoredSelectedTrip();
    if (storedTrip?.payment?.paid.full) {
      return 'confirmed';
    }
    return storedTrip?.payment_status ?? 'pending';
  });
  const [transportPaymentStatus, setTransportPaymentStatus] = useState<PaymentStatus>(() => {
    const storedTrip = readStoredSelectedTrip();
    return storedTrip?.payment?.paid.transport ? 'confirmed' : 'pending';
  });
  const [showTransportPaidOverlay, setShowTransportPaidOverlay] = useState(false);
  const hasHydratedSelectionRef = useRef(false);

  const travellersCount = selectedTrip ? selectedTrip.adults + selectedTrip.children : 0;
  const selectionLimit = Math.max(1, travellersCount);
  const liveTransportAmount = calculateTransportTotal({
    mode: transportItinerary?.mode ?? 'bus',
    selectedSeats,
    selectedFare,
    travellersCount: selectionLimit,
  });
  const isTransportLocked = paymentState.paid.transport || paymentState.paid.full;

  useEffect(() => {
    if (!selectedTrip) {
      setTransportItinerary(null);
      setSelectedSeats([]);
      setSelectedFare(null);
      setPaymentState(createDefaultTripPaymentState(null));
      setFullPaymentStatus('pending');
      setTransportPaymentStatus('pending');
      setShowTransportPaidOverlay(false);
      return;
    }

    const nextItinerary = buildTransportItinerary(selectedTrip);
    const storedSelection = readStoredTransportSelection(selectedTrip.trip_id);
    const restoredSeats = restoreSelectedSeats(nextItinerary.seats, storedSelection?.seatIds ?? []);
    const restoredFare =
      nextItinerary.mode === 'bus'
        ? null
        : restoreSelectedFare(
            nextItinerary.fareOptions,
            storedSelection?.fareType ?? null
          );
    const nextPaymentState = mergeTripPaymentState(selectedTrip, selectedTrip.payment);

    setTransportItinerary(nextItinerary);
    setSelectedSeats(restoredSeats);
    setSelectedFare(restoredFare);
    setPaymentState(nextPaymentState);
    setFullPaymentStatus(nextPaymentState.paid.full ? 'confirmed' : selectedTrip.payment_status ?? 'pending');
    setTransportPaymentStatus(nextPaymentState.paid.transport ? 'confirmed' : 'pending');
    setShowTransportPaidOverlay(false);
  }, [selectedTrip]);

  useEffect(() => {
    if (!selectedTrip) {
      writeStoredSelectedTrip(null);
      return;
    }

    writeStoredSelectedTrip({
      ...selectedTrip,
      payment: paymentState,
      payment_status: paymentState.paid.full ? 'confirmed' : fullPaymentStatus,
      paid_at: paymentState.paid.full ? selectedTrip.paid_at ?? new Date().toISOString() : selectedTrip.paid_at ?? null,
    });
  }, [selectedTrip, paymentState, fullPaymentStatus]);

  useEffect(() => {
    hasHydratedSelectionRef.current = false;
  }, [selectedTrip?.trip_id]);

  useEffect(() => {
    if (!selectedTrip?.trip_id) {
      return;
    }

    if (!hasHydratedSelectionRef.current) {
      hasHydratedSelectionRef.current = true;
      return;
    }

    writeStoredTransportSelection(selectedTrip.trip_id, {
      seatIds: selectedSeats.map((seat) => seat.id),
      fareType: selectedFare?.type ?? null,
    });
  }, [selectedTrip?.trip_id, selectedSeats, selectedFare?.type]);

  useEffect(() => {
    if (!selectedTrip) {
      return;
    }

    const totalAmount = getBudgetEstimate(selectedTrip.result.total_budget);

    setPaymentState((current) => {
      const nextState: TripPaymentState = {
        totalAmount,
        transportAmount: isTransportLocked ? current.transportAmount : liveTransportAmount,
        paid: current.paid,
      };

      return paymentStatesMatch(current, nextState) ? current : nextState;
    });
  }, [selectedTrip, liveTransportAmount, isTransportLocked]);

  const toggleSeat = (seatId: string) => {
    if (!transportItinerary || transportItinerary.mode !== 'bus' || isTransportLocked) {
      return;
    }

    const seat = transportItinerary.seats.find((item) => item.id === seatId);
    if (!seat) {
      return;
    }

    setSelectedSeats((current) => toggleSeatSelection(current, seat, selectionLimit));
  };

  const selectFare = (fareType: string) => {
    if (!transportItinerary || transportItinerary.mode === 'bus' || isTransportLocked) {
      return;
    }

    const nextFare = transportItinerary.fareOptions.find(
      (option) => option.type === fareType && option.availability !== 'Not Available'
    );

    if (!nextFare) {
      return;
    }

    setSelectedFare(nextFare);
  };

  const calculateTotalPrice = () => liveTransportAmount;

  const setItinerary = (itinerary: TransportItinerary | null) => {
    setTransportItinerary(itinerary);
    setSelectedSeats([]);
    setSelectedFare(
      itinerary && itinerary.mode !== 'bus' ? getRecommendedFareOption(itinerary.fareOptions) : null
    );

    if (selectedTrip?.trip_id) {
      clearStoredTransportSelection(selectedTrip.trip_id);
    }
  };

  return (
    <TripContext.Provider
      value={{
        selectedTrip,
        setSelectedTrip,
        transportItinerary,
        selectedSeats,
        selectedFare,
        travellersCount,
        selectionLimit,
        toggleSeat,
        selectFare,
        calculateTotalPrice,
        setItinerary,
        paymentState,
        setPaymentState,
        fullPaymentStatus,
        setFullPaymentStatus,
        transportPaymentStatus,
        setTransportPaymentStatus,
        isTransportLocked,
        showTransportPaidOverlay,
        setShowTransportPaidOverlay,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTripContext() {
  const context = useContext(TripContext);

  if (!context) {
    raiseError();
  }

  return context;
}

function raiseError(): never {
  throw new Error('useTripContext must be used within a TripProvider.');
}

function buildTransportItinerary(trip: BudgetGenerateResponse): TransportItinerary {
  const mode = normalizeTransportMode(trip.result.transportMode || trip.result.transport.mode);
  const boardingPoints = trip.result.boardingPoints ?? [];
  const intermediateStops = trip.result.intermediateStops ?? [];
  const droppingPoints = trip.result.droppingPoints ?? [];

  let seats = trip.result.seats ?? [];
  let seatLayout = trip.result.seatLayout ?? { rows: 0, cols: 0 };

  // FIX: Defensive fallback — if mode is bus but seat data is missing (e.g.
  // stale localStorage entry from an older schema, or a Gemini response that
  // was partially parsed), generate a minimal seat grid so the UI never shows
  // "0 seats open" for an active bus itinerary.
  if (mode === 'bus' && seats.length === 0) {
    const travellers = Math.max(1, trip.adults + trip.children);
    const seatCount = Math.max(8, travellers + 4);
    seats = Array.from({ length: seatCount }, (_, i) => ({
      id: `S${i + 1}`,
      row: Math.floor(i / 4) + 1,
      col: (i % 4) + 1,
      type: (i % 4) < 2 ? 'semi-sleeper' : 'seater',
      price: 850 + (i % 3) * 150,
      isBooked: i === 2 || i === 5,
    }));
    seatLayout = { rows: Math.ceil(seatCount / 4), cols: 4 };
  }

  return {
    mode,
    timeSlots: TIME_SLOTS[mode] ?? TIME_SLOTS.bus,
    seatLayout,
    seats,
    fareOptions: trip.result.fareOptions ?? [],
    boardingPoints,
    intermediateStops,
    droppingPoints,
    timeline: [
      ...boardingPoints.map((point) => ({ ...point, kind: 'boarding' as const })),
      ...intermediateStops.map((point) => ({ ...point, kind: 'stop' as const })),
      ...droppingPoints.map((point) => ({ ...point, kind: 'dropping' as const })),
    ],
  };
}

function normalizeTransportMode(value: string): TransportMode {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'train' || normalized === 'flight') {
    return normalized;
  }

  return 'bus';
}

function restoreSelectedSeats(seats: TransportSeat[], seatIds: string[]): TransportSeat[] {
  if (seatIds.length === 0) {
    return [];
  }

  const selectedSeatIds = new Set(seatIds);
  return seats.filter((seat) => selectedSeatIds.has(seat.id));
}

function restoreSelectedFare(
  fareOptions: FareOption[],
  fareType: string | null
): FareOption | null {
  if (!fareType) {
    return getRecommendedFareOption(fareOptions);
  }

  return fareOptions.find((option) => option.type === fareType) ?? getRecommendedFareOption(fareOptions);
}
