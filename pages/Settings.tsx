import React, { useEffect, useState } from 'react';
import { Globe, Key, Info, Save, Eye, EyeOff, Cpu } from 'lucide-react';
import { AIProvider, AppSettings, Language } from '../types';
import { dbService } from '../services/db';
import { listOllamaCloudModels } from '../services/geminiService';

interface SettingsProps {
    settings: AppSettings;
    onSettingsChange: (newSettings: AppSettings) => void;
}

const PROVIDERS: { value: AIProvider; label: string; help: string }[] = [
    { value: 'gemini', label: 'Google Gemini', help: 'Recommandé pour image/vidéo/audio.' },
    { value: 'openai', label: 'OpenAI', help: 'Bon pour texte et JSON.' },
    { value: 'anthropic', label: 'Anthropic Claude', help: 'Très bon en analyse structurée.' },
    { value: 'ollama', label: 'Ollama Cloud', help: 'API distante officielle (ex: https://ollama.com).' }
];

export const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
    const [provider, setProvider] = useState<AIProvider>('gemini');
    const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({ gemini: '', openai: '', anthropic: '', ollama: '' });
    const [showKey, setShowKey] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [ollamaBaseUrl, setOllamaBaseUrl] = useState('https://ollama.com');
    const [ollamaModel, setOllamaModel] = useState('gpt-oss:120b');
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState('');

    useEffect(() => {
        setProvider(dbService.getProvider());
        setApiKeys({
            gemini: dbService.getApiKey('gemini') || '',
            openai: dbService.getApiKey('openai') || '',
            anthropic: dbService.getApiKey('anthropic') || '',
            ollama: dbService.getApiKey('ollama') || ''
        });
        setOllamaBaseUrl(dbService.getOllamaBaseUrl());
        setOllamaModel(dbService.getOllamaModel());
    }, []);

    const handleLanguageChange = (lang: Language) => {
        onSettingsChange({ ...settings, language: lang });
    };

    const handleSave = () => {
        dbService.setProvider(provider);
        (Object.keys(apiKeys) as AIProvider[]).forEach(p => dbService.setApiKey(p, apiKeys[p].trim()));
        dbService.setOllamaBaseUrl(ollamaBaseUrl.trim() || 'https://ollama.com');
        dbService.setOllamaModel(ollamaModel.trim() || 'gpt-oss:120b');
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
    };


    const handleLoadOllamaModels = async () => {
        setLoadingModels(true);
        setModelsError('');
        try {
            dbService.setOllamaBaseUrl(ollamaBaseUrl.trim() || 'https://ollama.com');
            dbService.setApiKey('ollama', apiKeys.ollama.trim());
            const models = await listOllamaCloudModels();
            setOllamaModels(models);
            if (!ollamaModel && models.length > 0) {
                setOllamaModel(models[0]);
            }
        } catch (error: any) {
            setModelsError(error?.message || 'Impossible de charger les modèles Ollama.');
        } finally {
            setLoadingModels(false);
        }
    };

    const triggerVeoKeySelection = async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                alert('Sélecteur de clé ouvert. Choisissez un projet payant pour activer Veo.');
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Paramètres de l'Application</h1>
                <p className="text-slate-400">Choisissez votre provider IA et gérez vos accès API.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-dark-900 border border-slate-800 rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-900/30 rounded-lg"><Globe className="w-6 h-6 text-blue-400" /></div>
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

                <div className="space-y-6">
                    <div className="bg-dark-900 border border-slate-800 rounded-2xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-yellow-900/30 rounded-lg"><Key className="w-6 h-6 text-yellow-400" /></div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Providers IA</h3>
                                <p className="text-sm text-slate-500">Gemini, OpenAI, Anthropic et Ollama.</p>
                            </div>
                        </div>

                        <div className="bg-dark-950 rounded-xl p-5 border border-slate-800 mb-6 space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-300 mb-2 block">Provider actif</label>
                                <div className="space-y-2">
                                    {PROVIDERS.map(item => (
                                        <label key={item.value} className={`block border rounded-lg px-3 py-2 cursor-pointer ${provider === item.value ? 'border-brand-500 bg-brand-900/20' : 'border-slate-700'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-200 font-medium">{item.label}</span>
                                                <input type="radio" name="provider" checked={provider === item.value} onChange={() => setProvider(item.value)} />
                                            </div>
                                            <p className="text-xs text-slate-500">{item.help}</p>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-300 mb-2 block">Clé API ({provider})</label>
                                <div className="relative flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showKey ? 'text' : 'password'}
                                            value={apiKeys[provider]}
                                            onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                                            placeholder={provider === 'gemini' ? 'AIzaSy...' : provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : 'OLLAMA_API_KEY'}
                                            className="w-full bg-dark-900 border border-slate-700 text-white rounded-lg pl-3 pr-10 py-3 focus:border-yellow-500 outline-none text-sm font-mono"
                                        />
                                        <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <label className="text-sm font-bold text-slate-300">Ollama Base URL
                                    <input value={ollamaBaseUrl} onChange={(e) => setOllamaBaseUrl(e.target.value)} className="mt-1 w-full bg-dark-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm" />
                                </label>
                                <label className="text-sm font-bold text-slate-300">Ollama Model
                                    <input value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} list="ollama-model-list" className="mt-1 w-full bg-dark-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm" />
                                    <datalist id="ollama-model-list">
                                        {ollamaModels.map(model => <option key={model} value={model} />)}
                                    </datalist>
                                </label>
                                <button onClick={handleLoadOllamaModels} disabled={loadingModels} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 border border-slate-700 rounded-lg py-2 text-sm font-semibold">
                                    {loadingModels ? 'Chargement modèles...' : 'Charger modèles cloud (/api/tags)'}
                                </button>
                                {modelsError && <p className="text-xs text-red-400">{modelsError}</p>}
                            </div>

                            <button onClick={handleSave} className="w-full bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-lg transition-colors font-bold flex justify-center gap-2 items-center">
                                <Save className="w-5 h-5" /> Sauvegarder
                            </button>
                            {savedSuccess && <p className="text-xs text-green-400">Paramètres sauvegardés.</p>}
                        </div>

                        <div className="border-t border-slate-800 pt-6">
                            <h4 className="text-white font-medium mb-2">Génération Vidéo (Veo)</h4>
                            <p className="text-sm text-slate-400 mb-4">Veo reste disponible via Gemini avec authentification projet.</p>
                            <button onClick={triggerVeoKeySelection} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                                <Cpu className="w-4 h-4" /> Authentification Projet (OAuth)
                            </button>
                        </div>
                    </div>

                    <div className="bg-dark-900 border border-slate-800 rounded-2xl p-6 flex gap-4">
                        <Info className="w-6 h-6 text-slate-500 flex-shrink-0" />
                        <div>
                            <h4 className="text-white font-bold text-sm">Notes d'utilisation API</h4>
                            <p className="text-xs text-slate-400 mt-1">Correction appliquée : les clés sont lues via Vite (`import.meta.env`) et via SQLite local. Pour Ollama Cloud, utilisez `https://ollama.com/api/chat` avec un token (Authorization: Bearer OLLAMA_API_KEY). Vous pouvez charger les modèles disponibles via `/api/tags`.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
