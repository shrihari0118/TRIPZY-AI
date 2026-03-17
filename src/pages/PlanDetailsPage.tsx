// src/pages/PlanDetailsPage.tsx

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowLeft } from 'lucide-react';
import { PricingPlan } from '../components/pricing/pricingData';

const PlanDetailsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const plan: PricingPlan = location.state?.plan;

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Plan Not Found</h2>
          <p className="text-gray-600 mb-6">Please select a plan from the pricing page.</p>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Go to Pricing
          </button>
        </div>
      </div>
    );
  }

  const handleSubscribe = () => {
    // Here you would integrate with your payment system
    alert(`Subscribing to ${plan.name} plan!`);
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center text-blue-500 hover:text-blue-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Pricing
        </button>

        <motion.div
          className="bg-white rounded-lg shadow-lg p-8"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{plan.name} Plan</h1>
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {plan.currency}{plan.price.toLocaleString()}
              <span className="text-xl font-normal text-gray-600">/{plan.period}</span>
            </div>
            {plan.recommended && (
              <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium mt-2">
                Recommended
              </span>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What's Included</h2>
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <motion.li
                  key={index}
                  className="flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Check className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 text-lg">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <motion.button
            onClick={handleSubscribe}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-colors duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Subscribe to {plan.name}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PlanDetailsPage;