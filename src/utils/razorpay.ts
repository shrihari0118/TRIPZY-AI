const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-js';
const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise: Promise<boolean> | null = null;

/**
 * Returns true when the app is running on localhost.
 *
 * Razorpay's UPI QR image endpoint (api.razorpay.com) is blocked by browsers
 * when the *origin* is a loopback address (localhost / 127.x.x.x).
 * Browsers treat it as a mixed-content / CORS violation because the image
 * is served over HTTPS but the consuming page is plain HTTP on a loopback.
 *
 * Solution: detect localhost and remove "upi" from the displayed payment
 * methods so Razorpay pre-selects the card tab, which works fine on localhost.
 */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve) => {
    const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(Boolean(window.Razorpay)), {
        once: true,
      });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export function openRazorpayCheckout(
  options: RazorpayOptions
): Promise<RazorpayPaymentSuccessResponse> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay checkout is unavailable.'));
      return;
    }

    // On localhost, Razorpay's UPI QR images are blocked by the browser
    // (CORS + mixed-content policy on loopback origins). Hide UPI entirely
    // so testers can use the card flow, which works without any restrictions.
    const localhostOverrides: Partial<RazorpayOptions> = isLocalhost()
      ? {
          config: {
            display: {
              hide: [{ method: 'upi' }],
              preferences: { show_default_blocks: true },
            },
          },
        }
      : {};

    const razorpay = new window.Razorpay({
      ...options,
      ...localhostOverrides,
      modal: {
        ...options.modal,
        ondismiss: () => {
          options.modal?.ondismiss?.();
          reject(new Error('Payment was cancelled.'));
        },
      },
      handler: (response) => resolve(response),
    });

    razorpay.on('payment.failed', (response) => {
      reject(new Error(response.error?.description || 'Payment failed.'));
    });
    razorpay.open();
  });
}
