import React, { useState } from 'react';
import { Image as ImageIcon, Video, Mic, Download, Play, Loader2, Sparkles, Key, FileText, Copy, Check } from 'lucide-react';
import { generateMarketingImage, generateMarketingVideo, generateMarketingAudio, generateMarketingText, playAudioBuffer } from '../services/geminiService';

enum Tab {
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    TEXT = 'text'
}

export const Assets: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>(Tab.IMAGE);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null); // For Image/Video URL or Text content
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [copied, setCopied] = useState(false);

    // Specific state for Veo Key Selection
    const [showKeySelector, setShowKeySelector] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        setResult(null);
        setAudioBuffer(null);
        setCopied(false);

        try {
            if (activeTab === Tab.IMAGE) {
                const url = await generateMarketingImage(prompt);
                setResult(url);
            } else if (activeTab === Tab.VIDEO) {
                // Check if we need to select a key for Veo
                if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                    const url = await generateMarketingVideo(prompt);
                    setResult(url);
                } else if (window.aistudio) {
                    setShowKeySelector(true);
                    setLoading(false);
                    return; // Stop here, user needs to select key
                } else {
                     // Fallback if window.aistudio is not available
                     const url = await generateMarketingVideo(prompt);
                     setResult(url);
                }
            } else if (activeTab === Tab.AUDIO) {
                const buffer = await generateMarketingAudio(prompt);
                setAudioBuffer(buffer);
            } else if (activeTab === Tab.TEXT) {
                const text = await generateMarketingText(prompt);
                setResult(text);
            }
        } catch (error) {
            console.error("Generation error", error);
            alert("Erreur lors de la génération. Vérifiez votre clé API ou réessayez.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            setShowKeySelector(false);
        }
    };

    const handlePlayAudio = () => {
        if (audioBuffer) playAudioBuffer(audioBuffer);
    };

    const handleCopy = () => {
        if (result && activeTab === Tab.TEXT) {
            navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Studio Créatif AI</h1>
                <p className="text-slate-400">Générez des visuels, des publicités vidéo, des voix off et du texte persuasif.</p>
            </header>

            {/* Tabs */}
            <div className="flex space-x-2 bg-dark-900 p-1 rounded-xl w-fit border border-slate-800 flex-wrap">
                {[
                    { id: Tab.IMAGE, icon: ImageIcon, label: "Image" },
                    { id: Tab.VIDEO, icon: Video, label: "Vidéo (Veo)" },
                    { id: Tab.AUDIO, icon: Mic, label: "Audio (TTS)" },
                    { id: Tab.TEXT, icon: FileText, label: "Copywriting" }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setResult(null); setAudioBuffer(null); setPrompt(''); }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                            activeTab === tab.id 
                            ? 'bg-brand-600 text-white shadow-lg' 
                            : 'text-slate-400 hover:text-white hover:bg-dark-800'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Area */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-dark-900 border border-slate-800 rounded-2xl p-6">
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                            {activeTab === Tab.AUDIO ? "Texte à prononcer" : "Description du prompt"}
                        </label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={6}
                            className="w-full bg-dark-950 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
                            placeholder={
                                activeTab === Tab.AUDIO ? "Entrez le script de votre publicité ici..." : 
                                activeTab === Tab.TEXT ? "Décrivez le produit, la cible et le ton (ex: fun, professionnel)..." :
                                "Décrivez le produit, l'ambiance, l'éclairage..."
                            }
                        />
                        
                        {showKeySelector ? (
                            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-xl">
                                <p className="text-yellow-200 text-sm mb-3">La génération vidéo nécessite une clé API payante sélectionnée.</p>
                                <button 
                                    onClick={handleSelectKey}
                                    className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-lg font-medium"
                                >
                                    <Key className="w-4 h-4" /> Sélectionner une Clé
                                </button>
                                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block mt-2 text-xs text-center text-slate-400 underline">Infos facturation</a>
                            </div>
                        ) : (
                            <button 
                                onClick={handleGenerate}
                                disabled={loading || !prompt}
                                className="mt-4 w-full bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                Générer
                            </button>
                        )}
                    </div>

                    <div className="bg-dark-900/50 p-4 rounded-xl border border-slate-800/50">
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">Conseils Pro</h4>
                        <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                             {activeTab === Tab.TEXT ? (
                                <>
                                    <li>Précisez la cible (ex: "jeunes 18-25 ans").</li>
                                    <li>Définissez le ton (ex: "humoristique", "urgent").</li>
                                    <li>Listez les avantages clés à mettre en avant.</li>
                                </>
                             ) : (
                                <>
                                    <li>Soyez précis sur l'éclairage (ex: "cinematic lighting").</li>
                                    <li>Mentionnez le style (ex: "minimalist", "luxury").</li>
                                    <li>Pour l'audio, utilisez la ponctuation pour le rythme.</li>
                                </>
                             )}
                        </ul>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-2 bg-dark-950 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center min-h-[400px] relative overflow-hidden group p-6">
                    {loading && (
                        <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                            <p className="text-slate-300 font-medium">L'IA travaille sur votre chef-d'œuvre...</p>
                            {activeTab === Tab.VIDEO && <p className="text-slate-500 text-sm mt-2">Cela peut prendre quelques minutes.</p>}
                        </div>
                    )}

                    {!result && !audioBuffer && !loading && (
                        <div className="text-center text-slate-600">
                            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Le contenu généré apparaîtra ici</p>
                        </div>
                    )}

                    {activeTab === Tab.IMAGE && result && (
                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            <img src={result} alt="Generated" className="max-h-[500px] rounded-lg shadow-2xl" />
                            <a href={result} download="marketing-image.png" className="absolute bottom-6 right-6 bg-white text-dark-900 p-3 rounded-full shadow-lg hover:scale-110 transition-transform">
                                <Download className="w-6 h-6" />
                            </a>
                        </div>
                    )}

                    {activeTab === Tab.VIDEO && result && (
                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            <video src={result} controls className="max-h-[500px] rounded-lg shadow-2xl w-full" />
                        </div>
                    )}

                    {activeTab === Tab.AUDIO && audioBuffer && (
                        <div className="text-center">
                            <div className="w-32 h-32 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <Mic className="w-12 h-12 text-brand-500" />
                            </div>
                            <button 
                                onClick={handlePlayAudio}
                                className="bg-white text-dark-900 px-8 py-3 rounded-full font-bold flex items-center gap-3 hover:bg-slate-200 transition-colors mx-auto"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Écouter la voix
                            </button>
                        </div>
                    )}

                    {activeTab === Tab.TEXT && result && (
                        <div className="w-full h-full flex flex-col items-start justify-start">
                             <div className="w-full bg-dark-900 border border-slate-700 rounded-xl p-6 relative shadow-xl">
                                <button 
                                    onClick={handleCopy}
                                    className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700"
                                    title="Copier le texte"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap font-medium text-slate-200">
                                    {result}
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};