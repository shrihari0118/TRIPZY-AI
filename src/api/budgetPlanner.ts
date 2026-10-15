import type { PaymentStatus, TripPaymentState } from './payment';

export type BudgetTier = 'budget' | 'moderate' | 'luxury';

const BASE_URL =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    'http://localhost:8000';

export type TripRequest = {
    startPlace: string;
    destinationPlace: string;
    startDate: string;
    endDate: string;
    budgetRange: BudgetTier;
    adults?: number;
    children?: number;
};

export type TotalBudget = {
    min: number;
    max: number;
};

export type TransportPlan = {
    mode: string;
    name: string;
};

export type TransportMode = 'bus' | 'train' | 'flight';

export type TransportSeat = {
    id: string;
    row: number;
    col: number;
    type: 'sleeper' | 'semi-sleeper' | 'seater' | string;
    price: number;
    isBooked: boolean;
};

export type TransportSeatLayout = {
    rows: number;
    cols: number;
};

export type FareOption = {
    type: string;
    price: number;
    availability: 'Available' | 'Few Left' | 'Not Available' | string;
};

export type TransportTimelinePoint = {
    time: string;
    name: string;
    description: string;
};

export type HotelPlan = {
    name: string;
    type: string;
};

export type TripPlanResult = {
    total_budget: TotalBudget;
    transportMode: TransportMode;
    transport: TransportPlan;
    seats: TransportSeat[];
    seatLayout: TransportSeatLayout;
    fareOptions: FareOption[];
    boardingPoints: TransportTimelinePoint[];
    intermediateStops: TransportTimelinePoint[];
    droppingPoints: TransportTimelinePoint[];
    hotel: HotelPlan;
    food: string[];
    tourist_places: string[];
    activities: string[];
    entertainment: string[];
};

export type BudgetGenerateResponse = {
    trip_id?: string;
    user_id: string | null;
    source: string;
    destination: string;
    days: number;
    adults: number;
    children: number;
    budget_type: BudgetTier;
    distance_km: number;
    result: TripPlanResult;
    created_at: string;
    payment: TripPaymentState;
    payment_status?: PaymentStatus;
    paid_at?: string | null;
};

export type BudgetRefreshResponse = BudgetGenerateResponse;

export type TripApiEnvelope = {
    status: 'success' | 'fallback' | 'retry_failed';
    message: string;
    data: BudgetGenerateResponse | null;
};

type BackendTripRequest = {
    source: string;
    destination: string;
    days: number;
    adults: number;
    children: number;
    budget_type: BudgetTier;
};

const FALLBACK_BASE_DAILY_COST: Record<BudgetTier, number> = {
    budget: 2200,
    moderate: 4800,
    luxury: 10500,
};

function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

async function postBackend<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        console.error(
            `[budgetPlanner] API error ${res.status} ${res.url}\n`,
            (() => { try { return JSON.parse(text); } catch { return text; } })()
        );
        throw new Error(`${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
}

function calculateDays(startDate: string, endDate: string): number {
    if (!startDate || !endDate) {
        return 1;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return Math.max(1, diff);
}

function toBackendTripRequest(payload: TripRequest): BackendTripRequest {
    return {
        source: payload.startPlace.trim(),
        destination: payload.destinationPlace.trim(),
        days: calculateDays(payload.startDate, payload.endDate),
        adults: Number(payload.adults ?? 1),
        children: Number(payload.children ?? 0),
        budget_type: payload.budgetRange,
    };
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return 'Trip generation failed';
}

function buildFallbackTotalBudget(payload: TripRequest): TotalBudget {
    const days = calculateDays(payload.startDate, payload.endDate);
    const adults = Number(payload.adults ?? 1);
    const children = Number(payload.children ?? 0);
    const baseDaily = FALLBACK_BASE_DAILY_COST[payload.budgetRange] ?? FALLBACK_BASE_DAILY_COST.moderate;
    const estimatedBase = (baseDaily * adults * days) + (Math.round(baseDaily * 0.6) * children * days);
    const min = Math.max(1500, Math.round((estimatedBase * 0.9) / 100) * 100);
    const max = Math.max(min + 500, Math.round((estimatedBase * 1.15) / 100) * 100);

    return { min, max };
}

function buildFallbackPayment(totalBudget: TotalBudget): TripPaymentState {
    return {
        totalAmount: Math.round((totalBudget.min + totalBudget.max) / 2),
        transportAmount: 0,
        paid: {
            transport: false,
            full: false,
        },
    };
}

// FIX: Frontend fallback previously hard-coded transportMode as 'train' with
// empty seats, causing "0 seats open" for budget-tier trips. Now mirrors the
// backend's fallback_transport_mode / fallback_seats logic so bus trips always
// include a filled seat grid even when the API is unreachable.

function fallbackTransportMode(budgetRange: string): TransportMode {
    if (budgetRange === 'luxury') return 'flight';
    if (budgetRange === 'moderate') return 'train';
    return 'bus';
}

function buildFallbackSeats(travellers: number): TransportSeat[] {
    const seatCount = Math.max(8, travellers + 4);
    const seats: TransportSeat[] = [];
    for (let i = 0; i < seatCount; i++) {
        const row = Math.floor(i / 4) + 1;
        const col = (i % 4) + 1;
        seats.push({
            id: `S${i + 1}`,
            row,
            col,
            type: col <= 2 ? 'semi-sleeper' : 'seater',
            price: 850 + (i % 3) * 150,
            isBooked: i === 2 || i === 5,
        });
    }
    return seats;
}

function buildFallbackFareOptions(mode: TransportMode): FareOption[] {
    if (mode === 'flight') {
        return [
            { type: 'Economy', price: 3200, availability: 'Available' },
            { type: 'Premium Economy', price: 5400, availability: 'Few Left' },
            { type: 'Business', price: 9800, availability: 'Available' },
        ];
    }
    return [
        { type: 'Sleeper', price: 1850, availability: 'Available' },
        { type: '3A', price: 2650, availability: 'Few Left' },
        { type: '2A', price: 3650, availability: 'Available' },
    ];
}

function buildFallbackResult(payload: TripRequest): TripPlanResult {
    const source = payload.startPlace.trim() || 'Source City';
    const destination = payload.destinationPlace.trim() || 'Destination City';
    const totalBudget = buildFallbackTotalBudget(payload);
    const travellers = Math.max(1, (payload.adults ?? 1) + (payload.children ?? 0));
    const mode = fallbackTransportMode(payload.budgetRange);

    const isBus = mode === 'bus';
    const transportLabel = mode === 'flight' ? 'Flight' : mode === 'train' ? 'Train' : 'Bus';
    const transportName = isBus
        ? `${source} ${destination} Intercity Coach`
        : mode === 'flight'
            ? `${source.slice(0, 3).toUpperCase()}-${destination.slice(0, 3).toUpperCase()} SkyConnect`
            : `${source} ${destination} Express`;

    return {
        total_budget: totalBudget,
        transportMode: mode,
        transport: {
            mode: transportLabel,
            name: transportName,
        },
        seats: isBus ? buildFallbackSeats(travellers) : [],
        seatLayout: isBus ? { rows: Math.ceil(Math.max(8, travellers + 4) / 4), cols: 4 } : { rows: 0, cols: 0 },
        fareOptions: isBus ? [] : buildFallbackFareOptions(mode),
        boardingPoints: [
            {
                time: '08:00 AM',
                name: isBus ? `${source} Central Boarding Point` : `${source} Central Station`,
                description: 'Arrive 20 minutes early for a smooth departure.',
            },
        ],
        intermediateStops: [
            {
                time: '12:30 PM',
                name: 'Mid-route Stop',
                description: 'Short refreshment break and quick local exploration.',
            },
        ],
        droppingPoints: [
            {
                time: '06:00 PM',
                name: isBus ? `${destination} Arrival Point` : `${destination} Main Station`,
                description: 'Arrival near the city center for hotel transfer.',
            },
        ],
        hotel: {
            name: `${destination} Travel Stay`,
            type: payload.budgetRange,
        },
        food: [
            'Local breakfast cafe',
            'Popular regional restaurant',
            'Evening market food street',
        ],
        tourist_places: [
            `${destination} Old Town`,
            `${destination} City Museum`,
            `${destination} Riverside Walk`,
        ],
        activities: [
            'Check in to the hotel',
            'Visit nearby attractions',
            'Try local food',
        ],
        entertainment: [
            'Main tourist sightseeing',
            'Shopping and cultural visit',
            'Relaxed evening leisure',
        ],
    };
}

export function buildFallbackBudgetPlan(payload: TripRequest): BudgetGenerateResponse {
    const totalBudget = buildFallbackTotalBudget(payload);
    const createdAt = new Date().toISOString();

    return {
        user_id: null,
        source: payload.startPlace.trim() || 'Source City',
        destination: payload.destinationPlace.trim() || 'Destination City',
        days: calculateDays(payload.startDate, payload.endDate),
        adults: Number(payload.adults ?? 1),
        children: Number(payload.children ?? 0),
        budget_type: payload.budgetRange,
        distance_km: 0,
        result: buildFallbackResult(payload),
        created_at: createdAt,
        payment: buildFallbackPayment(totalBudget),
        payment_status: 'pending',
        paid_at: null,
    };
}

async function fetchBudgetPlanSafe(payload: TripRequest): Promise<BudgetGenerateResponse> {
    try {
        const envelope = await postBackend<TripApiEnvelope>(
            '/generate-trip',
            toBackendTripRequest(payload)
        );

        if (!envelope.data) {
            throw new Error(envelope.message || 'Trip generation failed');
        }

        return envelope.data;
    } catch (error) {
        console.error('[budgetPlanner] Gemini Error:', getErrorMessage(error));
        return buildFallbackBudgetPlan(payload);
    }
}

// FIX: In-flight request deduplication map.
// If generateBudgetPlan() is called twice with identical params before the
// first resolves (e.g. React Strict Mode, rapid clicks that bypass the ref
// lock, or any other source), both callers share the same promise instead
// of firing two separate /generate-trip requests to the backend.
// The key is a deterministic JSON string of the request params.
const inflightRequests = new Map<string, Promise<BudgetGenerateResponse>>();

function buildDeduplicationKey(payload: TripRequest): string {
    return JSON.stringify({
        s: payload.startPlace.trim(),
        d: payload.destinationPlace.trim(),
        sd: payload.startDate,
        ed: payload.endDate,
        b: payload.budgetRange,
        a: payload.adults ?? 1,
        c: payload.children ?? 0,
    });
}

export async function generateBudgetPlan(
    payload: TripRequest
): Promise<BudgetGenerateResponse> {
    const key = buildDeduplicationKey(payload);

    // If an identical request is already in-flight, return the same promise.
    const existing = inflightRequests.get(key);
    if (existing) {
        return existing;
    }

    // Create the request and track it.
    const request = fetchBudgetPlanSafe(payload).finally(() => {
        inflightRequests.delete(key);
    });
    inflightRequests.set(key, request);

    return request;
}

export async function refreshBudgetPlan(
    payload: TripRequest
): Promise<BudgetRefreshResponse> {
    // Refresh intentionally bypasses deduplication — the user explicitly
    // wants a fresh result, so we always hit the backend.
    return fetchBudgetPlanSafe(payload);
}
