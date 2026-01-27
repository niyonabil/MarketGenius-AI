import React from 'react';
import { View } from '../types';
import { LayoutDashboard, Search, TrendingUp, Image as ImageIcon, Settings, ShoppingBag } from 'lucide-react';

interface LayoutProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setCurrentView, children }) => {
  const navItems = [
    { view: View.DASHBOARD, label: 'Tableau de bord', icon: LayoutDashboard },
    { view: View.RESEARCH, label: 'Recherche Produit', icon: Search },
    { view: View.TRENDS, label: 'Tendances & Analyse', icon: TrendingUp },
    { view: View.ASSETS, label: 'Studio Créatif', icon: ImageIcon },
  ];

  return (
    <div className="flex h-screen bg-dark-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-brand-600 p-2 rounded-lg">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">MarketGenius</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentView === item.view
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50'
                  : 'text-slate-400 hover:bg-dark-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
             <button
              onClick={() => setCurrentView(View.SETTINGS)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentView === View.SETTINGS
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-dark-800 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Paramètres</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
            {children}
        </div>
      </main>
    </div>
  );
};