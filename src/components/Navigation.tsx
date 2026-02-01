import { Link, useLocation } from 'react-router-dom';
import { Home, Languages, DollarSign, MapPin } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();

  const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/dashboard/translate', label: 'Translator', icon: Languages },
  { path: '/dashboard/budget', label: 'Budget Planner', icon: DollarSign },
  { path: '/dashboard/guide', label: 'Smart Guide', icon: MapPin },
];


  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-blue-600 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
