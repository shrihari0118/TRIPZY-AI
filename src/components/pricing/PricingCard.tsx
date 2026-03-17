// src/components/pricing/PricingCard.tsx

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PricingPlan } from './pricingData';

interface PricingCardProps {
  plan: PricingPlan;
  isYearly?: boolean;
}

export default function PricingCard({ plan, isYearly = false }: PricingCardProps) {
  const navigate = useNavigate();
  const displayPrice = isYearly ? plan.price * 10 : plan.price;
  const period = isYearly ? 'year' : plan.period;

  return (
    <motion.div
      className={`relative bg-white rounded-lg shadow-lg p-6 border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 ${
        plan.recommended ? 'border-blue-500' : 'border-gray-200'
      }`}
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {plan.recommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Recommended
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <div className="text-4xl font-bold text-gray-900 mb-1">
          {plan.currency}{displayPrice.toLocaleString()}
          <span className="text-lg font-normal text-gray-600">/{period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => navigate('/plan-details', { state: { plan } })}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-300 ${
          plan.recommended
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
        }`}
      >
        Choose Plan
      </button>
    </motion.div>
  );
};
