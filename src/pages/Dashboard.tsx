import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Languages, DollarSign, MapPin, ArrowRight } from "lucide-react";

export default function Dashboard() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
    }
  }, []);

  const features = [
    {
      title: "Speech Translator",
      description: "Real-time speech translation for seamless communication while traveling",
      icon: Languages,
      path: "/translate",
      color: "bg-blue-500",
    },
    {
      title: "Budget Planner",
      description: "Plan your travel expenses and get a detailed budget breakdown",
      icon: DollarSign,
      path: "/budget",
      color: "bg-green-500",
    },
    {
      title: "Smart Travel Guide",
      description: "Get contextual information about places, costs, and travel tips",
      icon: MapPin,
      path: "/guide",
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      <div className="relative mb-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-4 text-center"
        >
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Welcome {localStorage.getItem("name")} to Your Intelligent Travel Assistant
          </h1>

          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-600 md:text-xl">
            Your all-in-one solution for smart travel planning. Translate languages on the go,
            plan your budget, and get expert travel guidance powered by AI.
          </p>
        </motion.div>
      </div>

      <div className="grid gap-7 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              key={feature.path}
              to={feature.path}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-200/80 hover:shadow-[0_20px_50px_-30px_rgba(59,130,246,0.55)]"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/70 via-transparent to-indigo-50/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative z-10 flex h-full flex-col">
                <div
                  className={`${feature.color} mb-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  {feature.title}
                </h3>

                <p className="flex-1 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>

                <div className="mt-6 flex items-center text-sm font-semibold text-blue-600 transition-transform duration-300 group-hover:translate-x-2">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mt-16 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 text-white shadow-lg md:p-10"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18)_0,_transparent_60%)] opacity-80" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">

          <h2 className="mb-4 text-2xl font-semibold md:text-3xl">
            Travel Smarter, Not Harder
          </h2>

          <p className="mb-6 text-blue-100 md:text-lg">
            Whether you're planning a weekend getaway or a month-long adventure,
            our intelligent assistant helps you make the most of your journey.
          </p>

          <div className="grid gap-4 text-center sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
              <div className="text-3xl font-semibold">50+</div>
              <div className="text-sm text-blue-100">Languages</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
              <div className="text-3xl font-semibold">100%</div>
              <div className="text-sm text-blue-100">Accurate</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
              <div className="text-3xl font-semibold">24/7</div>
              <div className="text-sm text-blue-100">Available</div>
            </div>
          </div>

        </div>
      </motion.div>

    </div>
  );
}
