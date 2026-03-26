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

export type HotelPlan = {
    name: string;
    type: string;
};

export type TripPlanResult = {
    total_budget: TotalBudget;
    transport: TransportPlan;
    hotel: HotelPlan;
    food: string[];
    tourist_places: string[];
    activities: string[];
    entertainment: string[];
};

export type BudgetGenerateResponse = {
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
};

export type BudgetRefreshResponse = BudgetGenerateResponse;

type BackendTripRequest = {
    source: string;
    destination: string;
    days: number;
    adults: number;
    children: number;
    budget_type: BudgetTier;
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

export async function generateBudgetPlan(
    payload: TripRequest
): Promise<BudgetGenerateResponse> {
    return postBackend<BudgetGenerateResponse>(
        '/generate-trip',
        toBackendTripRequest(payload)
    );
}

export async function refreshBudgetPlan(
    payload: TripRequest
): Promise<BudgetRefreshResponse> {
    return postBackend<BudgetRefreshResponse>(
        '/generate-trip',
        toBackendTripRequest(payload)
    );
}
