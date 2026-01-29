import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, Loader2, AlertCircle, History, Filter, Trash2, Bookmark, ExternalLink, Settings as SettingsIcon } from 'lucide-react';
import { searchProducts } from '../services/geminiService';
import { SearchFilters, View } from '../types';
import { dbService } from '../services/db';

interface SavedSearch {
    id: string;
    query: string;
    filters: SearchFilters;
    timestamp: number;
}

interface ResearchProps {
    onViewChange: (view: View) => void;
}

export const Research: React.FC<ResearchProps> = ({ onViewChange }) => {
  const [query, setQuery] = useState('');
  // Filters State
  const [platform, setPlatform] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [category, setCategory] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedSearch[]>([]);

  // Load history from SQLite on mount
  useEffect(() => {
      loadHistoryFromDb();
  }, []);

  const loadHistoryFromDb = () => {
      const saved = dbService.getHistory();
      setHistory(saved);
  };

  const saveToHistory = (q: string, f: SearchFilters) => {
      const id = Date.now().toString();
      dbService.addSearch(id, q, f);
      loadHistoryFromDb(); // Refresh list
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      dbService.deleteSearch(id);
      loadHistoryFromDb(); // Refresh list
  }

  const loadSearch = (item: SavedSearch) => {
      setQuery(item.query);
      setPlatform(item.filters.platform || 'all');
      setPriceRange(item.filters.priceRange || 'all');
      setCategory(item.filters.category || '');
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const currentFilters: SearchFilters = {
        platform,
        priceRange,
        category
    };

    try {
      const data = await searchProducts(query, currentFilters);
      setResult(data);
      saveToHistory(query, currentFilters);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la recherche. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-8rem)]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-2">
        <header className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Comparateur de Marché & Sourcing</h1>
            <p className="text-slate-400">Analysez simultanément les marchés Chinois, Européens et Américains.</p>
        </header>

        {/* Filters & Search Box */}
        <div className="bg-dark-900 border border-slate-800 p-6 rounded-2xl mb-8 shadow-xl">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Platform Filter */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Focus Marché</label>
                    <select 
                        value={platform} 
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full bg-dark-950 border border-slate-700 text-white rounded-lg p-2.5 focus:border-brand-500 outline-none text-sm appearance-none"
                    >
                        <option value="all">Global (CN + EU + US)</option>
                        <option value="China">Chine (AliExpress/Alibaba)</option>
                        <option value="Europe">Europe (Amazon/Cdiscount)</option>
                        <option value="USA">USA (Amazon/Walmart)</option>
                    </select>
                </div>

                {/* Price Filter */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Budget / Prix</label>
                    <select 
                        value={priceRange} 
                        onChange={(e) => setPriceRange(e.target.value)}
                        className="w-full bg-dark-950 border border-slate-700 text-white rounded-lg p-2.5 focus:border-brand-500 outline-none text-sm appearance-none"
                    >
                        <option value="all">Indifférent</option>
                        <option value="Low Ticket (< 20€)">Low Ticket (&lt; 20€)</option>
                        <option value="Mid Ticket (20€ - 80€)">Mid Ticket (20€ - 80€)</option>
                        <option value="High Ticket (> 80€)">High Ticket (&gt; 80€)</option>
                    </select>
                </div>

                {/* Category Input */}
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catégorie</label>
                    <input 
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Ex: Beauté, Tech..."
                        className="w-full bg-dark-950 border border-slate-700 text-white rounded-lg p-2.5 focus:border-brand-500 outline-none text-sm placeholder-slate-600"
                    />
                </div>
             </div>

             <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-500" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Produit à comparer (Ex: Projecteur Galaxy, Correcteur de posture...)"
                    className="block w-full pl-12 pr-4 py-4 bg-dark-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                />
                <button
                    type="submit"
                    disabled={loading || !query}
                    className="absolute right-2 top-2 bottom-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 text-white px-6 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Comparer</>}
                </button>
            </form>
        </div>

        {/* Results Area */}
        <div className="flex-1">
            {error && (
                <div className="p-4 bg-red-900/30 border border-red-800 text-red-200 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                    {error.includes('Quota') && (
                        <button 
                            onClick={() => onViewChange(View.SETTINGS)}
                            className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                        >
                            <SettingsIcon className="w-4 h-4" />
                            Configurer Clé API
                        </button>
                    )}
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
                    <p className="text-slate-400 animate-pulse">Comparaison des prix et analyse des concurrents...</p>
                    <div className="flex gap-4 text-xs text-slate-600 uppercase tracking-widest">
                         <span>Amazon</span>
                         <span className="animate-pulse">•</span>
                         <span>AliExpress</span>
                         <span className="animate-pulse">•</span>
                         <span>TikTok</span>
                    </div>
                </div>
            )}

            {result && (
            <div className="bg-dark-900 border border-slate-800 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <article className="prose prose-invert max-w-none">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // Custom Table Styling
                            table: ({node, ...props}) => (
                                <div className="overflow-x-auto rounded-lg border border-slate-700 my-6 shadow-xl">
                                    <table className="w-full text-sm text-left text-slate-300" {...props} />
                                </div>
                            ),
                            thead: ({node, ...props}) => (
                                <thead className="text-xs text-slate-200 uppercase bg-dark-800 border-b border-slate-700" {...props} />
                            ),
                            th: ({node, ...props}) => (
                                <th className="px-6 py-4 font-semibold tracking-wider" {...props} />
                            ),
                            tbody: ({node, ...props}) => (
                                <tbody className="divide-y divide-slate-800 bg-dark-900/50" {...props} />
                            ),
                            tr: ({node, ...props}) => (
                                <tr className="hover:bg-dark-800/50 transition-colors" {...props} />
                            ),
                            td: ({node, ...props}) => (
                                <td className="px-6 py-4 whitespace-nowrap" {...props} />
                            ),
                            // Custom Link Styling
                            a: ({node, ...props}) => (
                                <a 
                                    className="text-brand-400 hover:text-brand-300 underline decoration-brand-400/30 hover:decoration-brand-300 transition-all inline-flex items-center gap-1" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    {...props}
                                >
                                    {props.children}
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                            ),
                            h2: ({node, ...props}) => (
                                <h2 className="text-2xl font-bold text-white mt-8 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2" {...props} />
                            )
                        }}
                    >
                        {result}
                    </ReactMarkdown>
                </article>
            </div>
            )}

            {!result && !loading && !error && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60">
                     <div className="p-6 bg-dark-900 border border-dashed border-slate-800 rounded-xl text-center">
                        <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <h3 className="text-white font-medium">Tableau Comparatif Complet</h3>
                        <p className="text-slate-500 text-sm">Comparez Amazon, AliExpress et la concurrence en un clic.</p>
                     </div>
                     <div className="p-6 bg-dark-900 border border-dashed border-slate-800 rounded-xl text-center">
                         <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <h3 className="text-white font-medium">Analyse Marge & Viralité</h3>
                        <p className="text-slate-500 text-sm">Estimez vos profits et découvrez le potentiel sur TikTok.</p>
                     </div>
                 </div>
            )}
        </div>
      </div>

      {/* History Sidebar */}
      <div className="w-full lg:w-80 bg-dark-900 border border-slate-800 rounded-2xl p-6 h-fit max-h-full overflow-y-auto sticky top-0">
          <div className="flex items-center justify-between mb-6 text-white border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-brand-400" />
                <h2 className="font-bold">Historique</h2>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">SQLITE</span>
          </div>
          
          <div className="space-y-3">
              {history.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Aucune recherche récente.</p>
              ) : (
                  history.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => loadSearch(item)}
                        className="group p-3 bg-dark-950 border border-slate-800 rounded-xl hover:border-brand-500/50 cursor-pointer transition-all relative"
                      >
                          <div className="pr-6">
                            <h4 className="text-slate-200 font-medium text-sm truncate">{item.query}</h4>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {item.filters.platform !== 'all' && (
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{item.filters.platform}</span>
                                )}
                                {item.filters.priceRange !== 'all' && (
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">€€</span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-600 mt-2">
                                {new Date(item.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            className="absolute top-3 right-3 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};