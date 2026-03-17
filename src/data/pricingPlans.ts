// src/data/pricingPlans.ts

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  recommended?: boolean;
  yearlyPrice?: number;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 499,
    currency: '₹',
    period: 'month',
    features: [
      'Up to 5 trips per month',
      'Basic itinerary planning',
      'Email support',
      'Mobile app access'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    currency: '₹',
    period: 'month',
    features: [
      'Unlimited trips',
      'Advanced itinerary customization',
      'Priority email support',
      'Real-time updates',
      'Offline access'
    ],
    recommended: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 1499,
    currency: '₹',
    period: 'month',
    features: [
      'Everything in Pro',
      'Personal travel assistant',
      '24/7 phone support',
      'Exclusive deals',
      'VIP concierge service'
    ]
  }
];