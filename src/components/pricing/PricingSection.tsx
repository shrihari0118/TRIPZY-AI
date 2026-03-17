// src/components/pricing/PricingSection.tsx

import { motion } from 'framer-motion';
import BudgetCard from '../BudgetCard';
import { BudgetPlan } from '../../data/budgetPlans';

interface PricingSectionProps {
  plans: BudgetPlan[];
}

export default function PricingSection({ plans }: PricingSectionProps) {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Your Trip Plans
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Choose the perfect plan for your travel needs
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <BudgetCard
                plan={plan}
                isSelected={false}
                onPersonalize={() => {}}
                ratios={undefined}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
