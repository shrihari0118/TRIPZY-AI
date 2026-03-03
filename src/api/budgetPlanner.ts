/**
 * budgetPlanner.ts
 * Typed API client for POST /v1/budget/generate and POST /v1/budget/refresh.
 * Base URL is read from VITE_API_BASE_URL (defaults to http://localhost:8000).
 * Step A: adults and children added to TripRequest and TripSummary.
 */

import { BudgetPlan } from '../data/budgetPlans';

// ── Base URL ──────────────────────────────────────────────────────────────────

const BASE_URL =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    'http://localhost:8000';

// ── Request Types ─────────────────────────────────────────────────────────────

export type TripRequest = {
    startPlace: string;
    destinationPlace: string;
    startDate: string;       // "YYYY-MM-DD"
    endDate: string;       // "YYYY-MM-DD"
    budgetRange: 'budget' | 'moderate' | 'luxury';
    adults?: number;       // optional; backend defaults to 1
    children?: number;       // optional; backend defaults to 0
    /** User-selected max budget cap (INR). Optional; if omitted system default applies. */
    maxBudget?: number;
    /** @deprecated Do not use. Replaced by adults + children. */
    numPeople?: never;
};

export type RefreshRequest = TripRequest & {
    requestId: string;              // UUID string from /generate response
};

// ── Response Types ────────────────────────────────────────────────────────────

export type TripSummary = {
    startPlace: string;
    destinationPlace: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    selectedBudgetRange: 'budget' | 'moderate' | 'luxury';
    adults: number;    // echoed from backend
    children: number;    // echoed from backend
};

export type BudgetGenerateResponse = {
    requestId: string;
    lastUpdatedAt: string;          // ISO datetime string
    trip_summary: TripSummary;
    plans: BudgetPlan[];    // exactly 3 items: budget, moderate, luxury
};

export type BudgetRefreshResponse = BudgetGenerateResponse;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        // Log the full FastAPI validation detail so 422 bodies are visible in console
        console.error(
            `[budgetPlanner] API error ${res.status} ${res.url}\n`,
            (() => { try { return JSON.parse(text); } catch { return text; } })()
        );
        throw new Error(`${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateBudgetPlan(
    payload: TripRequest
): Promise<BudgetGenerateResponse> {
    return post<BudgetGenerateResponse>('/v1/budget/generate', payload);
}

export async function refreshBudgetPlan(
    payload: RefreshRequest
): Promise<BudgetRefreshResponse> {
    return post<BudgetRefreshResponse>('/v1/budget/refresh', payload);
}
