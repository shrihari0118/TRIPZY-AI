import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Translator from "./pages/Translator";
import BudgetPlanner from "./pages/BudgetPlanner";
import TravelGuide from "./pages/TravelGuide";
import Profile from "./pages/Profile";

import Login from "./pages/Login";
import Register from "./pages/Register";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Pages */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* App Pages */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/translate" element={<Translator />} />
          <Route path="/dashboard/budget" element={<BudgetPlanner />} />
          <Route path="/dashboard/guide" element={<TravelGuide />} />

          <Route path="/translator" element={<Translator />} />
          <Route path="/budget" element={<BudgetPlanner />} />
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
    </BrowserRouter>
  );
}

export default App;
