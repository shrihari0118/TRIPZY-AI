export type BudgetPlanId = 'budget' | 'moderate' | 'luxury';

export type PlanCustomization = {
  transport: string;
  accommodation: string;
  food: string;
  activities: string[];
};

export type BudgetPlan = {
  id: BudgetPlanId;
  title: string;
  description: string;
  costRange: string;
  transport: string;
  accommodation: string;
  food: string;
  spots: string;
  activities: string[];
  options: {
    transport: string[];
    accommodation: string[];
    food: string[];
    activities: string[];
  };
};

export const budgetPlans: BudgetPlan[] = [
  {
    id: 'budget',
    title: 'Budget-Friendly',
    description: 'Student-first trips focused on essentials and discovery.',
    costRange: '\u20B99,000 - \u20B914,000',
    transport: 'AC Sleeper Bus',
    accommodation: 'Hostel dorm',
    food: 'Street food',
    spots: 'Heritage lanes, ghats, free museums',
    activities: [
      'Street food walk',
      'Local market trail',
      'Sunset viewpoint',
      'Budget city tour',
    ],
    options: {
      transport: ['Non-AC Bus', 'AC Sleeper Bus', '3A Train', '2S Train'],
      accommodation: ['Hostel dorm', '2-star hotel', 'Homestay'],
      food: ['Street food', 'Local thali', 'Canteen meals'],
      activities: [
        'Street food walk',
        'Local market trail',
        'Sunset viewpoint',
        'Budget city tour',
        'Temple hop',
        'Riverside stroll',
      ],
    },
  },
  {
    id: 'moderate',
    title: 'Moderate',
    description: 'Balanced comfort with curated city highlights.',
    costRange: '\u20B918,000 - \u20B926,000',
    transport: 'AC Chair Car',
    accommodation: '3-star hotel',
    food: 'Regional specials',
    spots: 'Top landmarks, guided city walk',
    activities: [
      'Guided heritage tour',
      'Lake boating',
      'Live folk show',
      'Cafe hopping',
    ],
    options: {
      transport: [
        'AC Chair Car',
        '3A Train',
        'Economy Flight',
        'Semi-sleeper Bus',
      ],
      accommodation: ['3-star hotel', 'Boutique stay', 'Serviced apartment'],
      food: ['Regional specials', 'Cafe combos', 'Mix of street + cafes'],
      activities: [
        'Guided heritage tour',
        'Lake boating',
        'Live folk show',
        'Cafe hopping',
        'Museum pass',
        'Craft workshop',
      ],
    },
  },
  {
    id: 'luxury',
    title: 'Luxury',
    description: 'Premium stays and private experiences throughout.',
    costRange: '\u20B938,000 - \u20B955,000',
    transport: 'Business Flight',
    accommodation: '5-star resort',
    food: 'Chef tasting menu',
    spots: 'Private sunrise tours, premium viewpoints',
    activities: [
      'Private photography tour',
      'Spa session',
      'Cultural performance',
      'Shopping concierge',
    ],
    options: {
      transport: [
        'Business Flight',
        'Premium train cabin',
        'Private SUV transfer',
      ],
      accommodation: [
        '5-star resort',
        'Heritage palace stay',
        'Luxury villa',
      ],
      food: ['Chef tasting menu', 'Fine dining', 'Rooftop lounges'],
      activities: [
        'Private photography tour',
        'Spa session',
        'Cultural performance',
        'Shopping concierge',
        'Private yacht evening',
        'Helicopter viewpoint',
      ],
    },
  },
];
