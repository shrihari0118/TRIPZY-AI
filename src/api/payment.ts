const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').trim();

export type PaymentType = 'transport' | 'full';
export type PaymentStatus = 'pending' | 'created' | 'confirmed' | 'verification_failed';
export type TripPaymentState = {
  totalAmount: number;
  transportAmount: number;
  paid: {
    transport: boolean;
    full: boolean;
  };
};

export type CreateOrderRequest = {
  amount?: number;
  totalAmount?: number;
  transportAmount?: number;
  trip_id?: string;
};

export type CreateTransportOrderRequest = {
  amount: number;
  totalAmount?: number;
  trip_id?: string;
};

export type CreateOrderResponse = {
  order_id: string;
  amount: number;
  currency: string;
  payment: TripPaymentState;
  payment_status: PaymentStatus;
  payment_type: PaymentType;
};

export type VerifyPaymentRequest = RazorpayPaymentSuccessResponse & {
  payment_type: PaymentType;
  trip_id?: string;
};

export type VerifyPaymentResponse = {
  success: boolean;
  payment_status: PaymentStatus;
  message: string;
  payment: TripPaymentState;
  payment_type: PaymentType;
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function postPayment<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const text = await response.text().catch(() => response.statusText);

  if (!response.ok) {
    const detail = parseApiError(text);
    console.error('[payment] API error', { url, status: response.status, detail });
    throw new Error(`${response.status}: ${detail}`);
  }

  if (!text) {
    throw new Error(`Empty response from ${url}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('[payment] Invalid JSON response', { url, text });
    throw new Error(`Invalid JSON response from ${url}`);
  }
}

export async function createPaymentOrder(
  payload: CreateOrderRequest
): Promise<CreateOrderResponse> {
  console.log('[payment] POST', `${BASE_URL}/api/payment/create-order`, payload);
  return postPayment<CreateOrderResponse>('/api/payment/create-order', payload);
}

export async function createTransportPaymentOrder(
  payload: CreateTransportOrderRequest
): Promise<CreateOrderResponse> {
  console.log('[payment] POST', `${BASE_URL}/api/payment/create-transport-order`, payload);
  return postPayment<CreateOrderResponse>('/api/payment/create-transport-order', payload);
}

export async function verifyPayment(
  payload: VerifyPaymentRequest
): Promise<VerifyPaymentResponse> {
  return postPayment<VerifyPaymentResponse>('/api/payment/verify-payment', payload);
}

function parseApiError(body: string): string {
  if (!body) {
    return 'Request failed.';
  }

  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
      return parsed.detail;
    }
    return body;
  } catch {
    return body;
  }
}
