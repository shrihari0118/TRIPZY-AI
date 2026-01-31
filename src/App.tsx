import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Translator from './pages/Translator';
import BudgetPlanner from './pages/BudgetPlanner';
import TravelGuide from './pages/TravelGuide';
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Dashboard from "./pages/Dashboard";

import Login from "./pages/Login";
import Register from "./pages/Register";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />

      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="translate" element={<Translator />} />
          <Route path="budget" element={<BudgetPlanner />} />
          <Route path="guide" element={<TravelGuide />} />
        </Route>
      </Routes>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
