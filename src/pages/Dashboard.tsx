import { Link } from 'react-router-dom';
import { Languages, DollarSign, MapPin, ArrowRight } from 'lucide-react';

export default function Dashboard() {
import { useEffect } from 'react';
import { Languages, DollarSign, MapPin, ArrowRight } from 'lucide-react';

export default function Dashboard() {
    useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
    }
  }, []);
const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("name");
  window.location.href = "/";
};

  const features = [
    {
      title: 'Speech Translator',
      description: 'Real-time speech translation for seamless communication while traveling',
      icon: Languages,
      path: '/translate',
      color: 'bg-blue-500',
    },
    {
      title: 'Budget Planner',
      description: 'Plan your travel expenses and get a detailed budget breakdown',
      icon: DollarSign,
      path: '/budget',
      color: 'bg-green-500',
    },
    {
      title: 'Smart Travel Guide',
      description: 'Get contextual information about places, costs, and travel tips',
      icon: MapPin,
      path: '/guide',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Your Intelligent Travel Assistant
        </h1>
      <div className="relative text-center mb-12">
<button
  onClick={handleLogout}
  className="absolute right-0 top-0 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
>
  Logout
</button>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
  Welcome {localStorage.getItem("name")} to Your Intelligent Travel Assistant
</h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your all-in-one solution for smart travel planning. Translate languages on the go,
          plan your budget, and get expert travel guidance powered by AI.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.path}
              to={feature.path}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow border border-gray-100 group"
            >
              <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {feature.description}
              </p>
              <div className="flex items-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Travel Smarter, Not Harder
          </h2>
          <p className="text-blue-100 mb-6">
            Whether you're planning a weekend getaway or a month-long adventure,
            our intelligent assistant helps you make the most of your journey.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-center">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">50+</div>
              <div className="text-sm text-blue-100">Languages</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-blue-100">Accurate</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm text-blue-100">Available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
