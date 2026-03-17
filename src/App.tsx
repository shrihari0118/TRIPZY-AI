import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Translator from "./pages/Translator";
import BudgetPlanner from "./pages/BudgetPlanner";
import TravelGuide from "./pages/TravelGuide";
import Profile from "./pages/Profile";
import PricingPage from "./pages/PricingPage";
import PlanDetailsPage from "./pages/PlanDetailsPage";

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
          <Route path="/profile" element={<Profile />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/plan-details" element={<PlanDetailsPage />} />
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
