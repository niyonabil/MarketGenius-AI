import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { View, AppSettings } from './types';
import { Research } from './pages/Research';
import { Trends } from './pages/Trends';
import { Assets } from './pages/Assets';
import { Settings } from './pages/Settings';
import { ShoppingCart, BarChart3, Rocket, Database } from 'lucide-react';
import { dbService } from './services/db';

const Dashboard: React.FC<{ onViewChange: (v: View) => void }> = ({ onViewChange }) => (
    <div className="space-y-8 animate-in fade-in duration-500">
        <header>
            <h1 className="text-4xl font-bold text-white mb-2">Bienvenue sur MarketGenius</h1>
            <p className="text-slate-400 text-lg">Votre assistant marketing IA pour dominer le e-commerce.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
                onClick={() => onViewChange(View.RESEARCH)}
                className="bg-gradient-to-br from-indigo-900 to-dark-900 border border-slate-700 p-8 rounded-2xl cursor-pointer hover:border-brand-500 transition-all group"
            >
                <div className="bg-indigo-500/20 w-fit p-3 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                    <Rocket className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Comparateur Produit</h3>
                <p className="text-slate-400">Analysez les prix, les concurrents et trouvez les produits gagnants (Amazon/AliExpress).</p>
            </div>

            <div 
                 onClick={() => onViewChange(View.TRENDS)}
                 className="bg-gradient-to-br from-emerald-900 to-dark-900 border border-slate-700 p-8 rounded-2xl cursor-pointer hover:border-brand-500 transition-all group"
            >
                <div className="bg-emerald-500/20 w-fit p-3 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Analyser les Trends</h3>
                <p className="text-slate-400">Visualisez les données de popularité et le sentiment social en temps réel.</p>
            </div>

            <div 
                 onClick={() => onViewChange(View.ASSETS)}
                 className="bg-gradient-to-br from-pink-900 to-dark-900 border border-slate-700 p-8 rounded-2xl cursor-pointer hover:border-brand-500 transition-all group"
            >
                <div className="bg-pink-500/20 w-fit p-3 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-8 h-8 text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Créer des Publicités</h3>
                <p className="text-slate-400">Générez des images produits, des vidéos promotionnelles et des voix off.</p>
            </div>
        </div>
        
        <div className="bg-dark-900 border border-slate-800 rounded-2xl p-8 mt-8">
            <div className="flex items-center gap-3 mb-4">
                 <Database className="w-6 h-6 text-brand-500" />
                 <h2 className="text-2xl font-bold text-white">État du Système</h2>
            </div>
            <div className="text-slate-400 text-sm">
                <p className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Base de données SQLite connectée et prête.</p>
            </div>
        </div>
    </div>
);

function App() {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [dbReady, setDbReady] = useState(false);
  
  // Initialize SQLite on startup
  useEffect(() => {
    const init = async () => {
        await dbService.init();
        setDbReady(true);
    };
    init();
  }, []);

  // Settings State with Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
      const saved = localStorage.getItem('marketgenius_settings');
      return saved ? JSON.parse(saved) : { language: 'fr', enableVeo: false };
  });

  const handleSettingsChange = (newSettings: AppSettings) => {
      setSettings(newSettings);
      localStorage.setItem('marketgenius_settings', JSON.stringify(newSettings));
  };

  if (!dbReady) {
      return (
          <div className="flex h-screen w-screen items-center justify-center bg-dark-950 text-white flex-col gap-4">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p>Chargement de la base de données...</p>
          </div>
      )
  }

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {currentView === View.DASHBOARD && <Dashboard onViewChange={setCurrentView} />}
      {currentView === View.RESEARCH && <Research onViewChange={setCurrentView} />}
      {currentView === View.TRENDS && <Trends settings={settings} onViewChange={setCurrentView} />}
      {currentView === View.ASSETS && <Assets />}
      {currentView === View.SETTINGS && <Settings settings={settings} onSettingsChange={handleSettingsChange} />}
    </Layout>
  );
}

export default App;