import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Translator from "./pages/Translator";
import BudgetPlanner from "./pages/BudgetPlanner";
import BudgetResults from "./pages/BudgetResults";
import TravelGuide from "./pages/TravelGuide";
import Profile from "./pages/Profile";
import TransportPage from "./pages/itinerary/TransportPage";
import AccommodationPage from "./pages/itinerary/AccommodationPage";
import FoodPage from "./pages/itinerary/FoodPage";
import TouristPage from "./pages/itinerary/TouristPage";
import ActivitiesPage from "./pages/itinerary/ActivitiesPage";

import Login from "./pages/Login";
import Register from "./pages/Register";

// ✅ IMPORT CHATBOT
import Chatbot from "./components/chatbot";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Pages */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* App Pages with Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/translate" element={<Translator />} />
          <Route path="/dashboard/budget" element={<BudgetPlanner />} />
          <Route path="/dashboard/guide" element={<TravelGuide />} />

          <Route path="/translator" element={<Translator />} />
          <Route path="/budget" element={<BudgetPlanner />} />
          <Route path="/budget-results" element={<BudgetResults />} />
          <Route path="/itinerary/transport" element={<TransportPage />} />
          <Route path="/itinerary/accommodation" element={<AccommodationPage />} />
          <Route path="/itinerary/food" element={<FoodPage />} />
          <Route path="/itinerary/tourist" element={<TouristPage />} />
          <Route path="/itinerary/activities" element={<ActivitiesPage />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />

      {/* ✅ CHATBOT – AVAILABLE ON ALL PAGES */}
      <Chatbot />
    </BrowserRouter>
  );
}

export default App;
