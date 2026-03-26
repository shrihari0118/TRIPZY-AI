import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { BudgetGenerateResponse } from '../api/budgetPlanner';

type TripContextValue = {
  selectedTrip: BudgetGenerateResponse | null;
  setSelectedTrip: Dispatch<SetStateAction<BudgetGenerateResponse | null>>;
};

const TripContext = createContext<TripContextValue | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const [selectedTrip, setSelectedTrip] = useState<BudgetGenerateResponse | null>(null);

  return (
    <TripContext.Provider value={{ selectedTrip, setSelectedTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTripContext() {
  const context = useContext(TripContext);

  if (!context) {
    raiseError();
  }

  return context;
}

function raiseError(): never {
  throw new Error('useTripContext must be used within a TripProvider.');
}
