// src/pages/PricingPage.tsx

import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import PricingSection from '../components/pricing/PricingSection';

const PricingPage: React.FC = () => {
  const location = useLocation();
  const plans = location.state?.plans || [];
  const tripData = location.state?.tripData;

  return (
    <motion.div
      className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Select the perfect plan for your travel needs
          </p>

          {/* Optional: show trip context */}
          {tripData && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Trip Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-medium">{tripData.values.startPlace}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">To</p>
                  <p className="font-medium">{tripData.values.destinationPlace}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dates</p>
                  <p className="font-medium">
                    {tripData.values.startDate} - {tripData.values.endDate}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Travellers</p>
                  <p className="font-medium">
                    {tripData.adults} Adults, {tripData.children} Children
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <PricingSection plans={plans} />
      </div>
    </motion.div>
  );
};

export default PricingPage;