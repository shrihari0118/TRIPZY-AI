/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_RAZORPAY_KEY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler?: (response: RazorpayPaymentSuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  /**
   * Razorpay checkout display configuration.
   * Used to hide payment methods that don't work in certain environments
   * (e.g. UPI QR on localhost is blocked by browser CORS policy).
   * See: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-display/
   */
  config?: {
    display?: {
      hide?: Array<{ method: string }>;
      preferences?: { show_default_blocks?: boolean };
    };
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (
    event: 'payment.failed',
    handler: (response: { error?: { description?: string } }) => void
  ) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

interface Window {
  Razorpay?: RazorpayConstructor;
}
