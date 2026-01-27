import React from 'react';
import { Globe, Key, Shield, Info } from 'lucide-react';
import { AppSettings, Language } from '../types';

interface SettingsProps {
    settings: AppSettings;
    onSettingsChange: (newSettings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
    
    const handleLanguageChange = (lang: Language) => {
        onSettingsChange({ ...settings, language: lang });
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
                                <h3 className="text-xl font-bold text-white">Clés API (GCP)</h3>
                                <p className="text-sm text-slate-500">Gestion des accès pour les modèles avancés (Veo).</p>
                            </div>
                        </div>

                        <div className="bg-dark-950 rounded-xl p-5 border border-slate-800 mb-6">
                             <div className="flex items-center gap-2 text-green-400 mb-2">
                                <Shield className="w-4 h-4" />
                                <span className="font-bold text-sm">Clé Principale Active</span>
                             </div>
                             <p className="text-xs text-slate-500">
                                 Votre clé `process.env.API_KEY` est configurée et sécurisée. Elle est utilisée pour Gemini Flash, Pro et Imagen.
                             </p>
                        </div>

                        <div className="border-t border-slate-800 pt-6">
                            <h4 className="text-white font-medium mb-2">Génération Vidéo (Veo)</h4>
                            <p className="text-sm text-slate-400 mb-4">
                                Le modèle de génération vidéo Veo nécessite une clé API liée à un projet facturable (Blaze Plan).
                            </p>
                            <button 
                                onClick={triggerVeoKeySelection}
                                className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <Key className="w-4 h-4" /> Configurer Clé Vidéo (Popup)
                            </button>
                            <p className="text-[10px] text-slate-500 mt-2 text-center">
                                Cela ouvrira la fenêtre de sélection de clé Google AI Studio.
                            </p>
                        </div>
                     </div>

                     <div className="bg-dark-900 border border-slate-800 rounded-2xl p-6 flex gap-4">
                        <Info className="w-6 h-6 text-slate-500 flex-shrink-0" />
                        <div>
                            <h4 className="text-white font-bold text-sm">À propos des Moteurs de Recherche</h4>
                            <p className="text-xs text-slate-400 mt-1">
                                L'IA utilise le "Grounding" Google Search pour récupérer les tendances. Bien qu'elle interroge l'index Google, nous incluons explicitement dans les prompts des demandes sur les tendances Bing et Yahoo pour vous offrir une vue globale.
                            </p>
                        </div>
                     </div>
                </div>

            </div>
        </div>
    );
};