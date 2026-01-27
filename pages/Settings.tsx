import React, { useState, useEffect } from 'react';
import { Globe, Key, Shield, Info, Save, Eye, EyeOff } from 'lucide-react';
import { AppSettings, Language } from '../types';
import { dbService } from '../services/db';

interface SettingsProps {
    settings: AppSettings;
    onSettingsChange: (newSettings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
    
    // API Key State
    const [customApiKey, setCustomApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    useEffect(() => {
        const key = dbService.getApiKey();
        if (key) setCustomApiKey(key);
    }, []);

    const handleLanguageChange = (lang: Language) => {
        onSettingsChange({ ...settings, language: lang });
    };

    const handleSaveApiKey = () => {
        dbService.setApiKey(customApiKey.trim());
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
    };

    const triggerVeoKeySelection = async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                alert("Sélecteur de clé ouvert. Veuillez choisir un projet payant pour activer Veo.");
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Paramètres de l'Application</h1>
                <p className="text-slate-400">Gérez vos préférences de génération et vos accès API.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Language Settings */}
                <div className="bg-dark-900 border border-slate-800 rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-900/30 rounded-lg">
                            <Globe className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Langue de Génération</h3>
                            <p className="text-sm text-slate-500">Pour les recherches, textes et analyses.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {[
                            { code: 'fr', label: 'Français (Défaut)' },
                            { code: 'en', label: 'English (US/UK)' },
                            { code: 'es', label: 'Español' },
                            { code: 'de', label: 'Deutsch' },
                            { code: 'it', label: 'Italiano' }
                        ].map((lang) => (
                            <label key={lang.code} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${settings.language === lang.code ? 'bg-blue-900/20 border-blue-500 shadow-md' : 'bg-dark-950 border-slate-800 hover:border-slate-600'}`}>
                                <span className="font-medium text-slate-200">{lang.label}</span>
                                <input 
                                    type="radio" 
                                    name="language" 
                                    value={lang.code}
                                    checked={settings.language === lang.code}
                                    onChange={() => handleLanguageChange(lang.code as Language)}
                                    className="accent-blue-500 w-5 h-5"
                                />
                            </label>
                        ))}
                    </div>
                </div>

                {/* API & Security Settings */}
                <div className="space-y-6">
                     <div className="bg-dark-900 border border-slate-800 rounded-2xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-yellow-900/30 rounded-lg">
                                <Key className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Clés API (Gemini)</h3>
                                <p className="text-sm text-slate-500">Utilisez votre propre clé pour éviter les limites de quota.</p>
                            </div>
                        </div>

                        {/* Custom API Key Input */}
                        <div className="bg-dark-950 rounded-xl p-5 border border-slate-800 mb-6">
                             <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-bold text-slate-300">Votre Clé API Personnelle</label>
                                {savedSuccess && <span className="text-xs text-green-400 font-bold animate-pulse">Sauvegardé !</span>}
                             </div>
                             
                             <div className="relative flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type={showKey ? "text" : "password"} 
                                        value={customApiKey}
                                        onChange={(e) => setCustomApiKey(e.target.value)}
                                        placeholder="AIzaSy..."
                                        className="w-full bg-dark-900 border border-slate-700 text-white rounded-lg pl-3 pr-10 py-3 focus:border-yellow-500 outline-none text-sm font-mono"
                                    />
                                    <button 
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button 
                                    onClick={handleSaveApiKey}
                                    className="bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-lg transition-colors"
                                    title="Sauvegarder"
                                >
                                    <Save className="w-5 h-5" />
                                </button>
                             </div>
                             
                             <p className="text-[10px] text-slate-500 mt-2">
                                 Stockée localement dans SQLite. Laissez vide pour utiliser la clé par défaut (limitée).
                                 <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-yellow-500 hover:underline ml-1">Obtenir une clé ici.</a>
                             </p>
                        </div>

                        <div className="border-t border-slate-800 pt-6">
                            <h4 className="text-white font-medium mb-2">Génération Vidéo (Veo)</h4>
                            <p className="text-sm text-slate-400 mb-4">
                                Le modèle vidéo nécessite une authentification spécifique pour la facturation.
                            </p>
                            <button 
                                onClick={triggerVeoKeySelection}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <Key className="w-4 h-4" /> Authentification Projet (OAuth)
                            </button>
                        </div>
                     </div>

                     <div className="bg-dark-900 border border-slate-800 rounded-2xl p-6 flex gap-4">
                        <Info className="w-6 h-6 text-slate-500 flex-shrink-0" />
                        <div>
                            <h4 className="text-white font-bold text-sm">À propos des Moteurs de Recherche</h4>
                            <p className="text-xs text-slate-400 mt-1">
                                L'IA utilise le "Grounding" Google Search pour récupérer les tendances. L'ajout d'une clé API personnelle augmente considérablement la fiabilité et la vitesse des recherches.
                            </p>
                        </div>
                     </div>
                </div>

            </div>
        </div>
    );
};