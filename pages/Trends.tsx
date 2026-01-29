import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, Activity, Search, Loader2, Tag, Target, Eye, DollarSign, Radar, Zap, Trophy, ArrowRight, BarChart2, Wand2, Play, Copy, Check, Video, Image as ImageIcon, Mic, Plus, Download, Package, Calendar, ExternalLink, Microscope, Share2, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { analyzeTrends, scanWinningProducts, generateCampaignStrategy, generateMarketingImage, generateMarketingVideo, generateMarketingAudio, playAudioBuffer, downloadKitAsZip, downloadFile, audioBufferToWavUrl } from '../services/geminiService';
import { TrendData, WinningProduct, MarketingKit, AppSettings, TimeRange, View } from '../types';

enum Mode {
    AUTO_SCAN = 'AUTO_SCAN',
    NICHE_ANALYSIS = 'NICHE_ANALYSIS',
    MARKETING_KIT = 'MARKETING_KIT'
}

interface TrendsProps {
    settings?: AppSettings;
    onViewChange: (view: View) => void;
}

export const Trends: React.FC<TrendsProps> = ({ settings, onViewChange }) => {
    const currentLang = settings?.language || 'fr';
    const [mode, setMode] = useState<Mode>(Mode.AUTO_SCAN);
    
    // Time Range State
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    
    // Niche Analysis State
    const [niche, setNiche] = useState('');
    const [data, setData] = useState<TrendData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto Scan State
    const [scanning, setScanning] = useState(false);
    const [winningProducts, setWinningProducts] = useState<WinningProduct[]>([]);
    const [scanError, setScanError] = useState<string | null>(null);

    // Marketing Kit State
    const [kitLoading, setKitLoading] = useState(false);
    const [kitData, setKitData] = useState<MarketingKit | null>(null);
    const [loadingSteps, setLoadingSteps] = useState({
        strategy: false,
        image: false,
        video: false,
        audio: false
    });

    const handleAnalysis = async (queryNiche: string = niche) => {
        if (!queryNiche) return;
        setNiche(queryNiche); // Update input if called from button
        setMode(Mode.NICHE_ANALYSIS);
        setLoading(true);
        setData(null);
        setError(null);
        try {
            const result = await analyzeTrends(queryNiche, currentLang, timeRange);
            setData(result);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Erreur d'analyse");
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (isLoadMore: boolean = false) => {
        setScanning(true);
        setScanError(null);
        if (!isLoadMore) {
            setWinningProducts([]);
        }

        try {
            const existingNames = isLoadMore ? winningProducts.map(p => p.name) : [];
            const results = await scanWinningProducts(existingNames, currentLang, timeRange);
            
            const startRank = existingNames.length + 1;
            const reindexedResults = results.map((p, index) => ({...p, rank: startRank + index}));

            setWinningProducts(prev => isLoadMore ? [...prev, ...reindexedResults] : reindexedResults);
        } catch (e: any) {
            console.error("Scan failed", e);
            setScanError(e.message || "Erreur lors du scan. Veuillez réessayer.");
        } finally {
            setScanning(false);
        }
    };

    const generateKit = async (product: WinningProduct) => {
        setMode(Mode.MARKETING_KIT);
        setKitLoading(true);
        setKitData(null);
        setLoadingSteps({ strategy: true, image: true, video: true, audio: true });

        try {
            // 1. Generate Strategy (Text)
            const strategy = await generateCampaignStrategy(product.name, currentLang);
            setKitData(prev => ({ 
                productName: product.name, 
                strategy, 
                imageUrl: prev?.imageUrl, 
                videoUrl: prev?.videoUrl, 
                audioBuffer: prev?.audioBuffer 
            }));
            setLoadingSteps(prev => ({ ...prev, strategy: false }));

            // 2. Launch Media Generation
            
            // Image (Pass the original image url for img-to-img if available)
            generateMarketingImage(strategy.imagePrompt, product.originalImageUrl)
                .then(url => {
                    setKitData(prev => prev ? { ...prev, imageUrl: url } : null);
                    setLoadingSteps(prev => ({ ...prev, image: false }));
                })
                .catch(e => { console.error("Image failed", e); setLoadingSteps(prev => ({ ...prev, image: false })); });

            // Audio
            generateMarketingAudio(strategy.videoScript)
                .then(buffer => {
                     setKitData(prev => prev ? { ...prev, audioBuffer: buffer } : null);
                     setLoadingSteps(prev => ({ ...prev, audio: false }));
                })
                .catch(e => { console.error("Audio failed", e); setLoadingSteps(prev => ({ ...prev, audio: false })); });

            // Video (Veo)
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                 generateMarketingVideo(strategy.videoPrompt)
                    .then(url => {
                        setKitData(prev => prev ? { ...prev, videoUrl: url } : null);
                        setLoadingSteps(prev => ({ ...prev, video: false }));
                    })
                    .catch(e => { console.error("Video failed", e); setLoadingSteps(prev => ({ ...prev, video: false })); });
            } else {
                setLoadingSteps(prev => ({ ...prev, video: false }));
            }

        } catch (e) {
            console.error("Kit Generation Failed", e);
            setLoadingSteps({ strategy: false, image: false, video: false, audio: false });
        } finally {
            setKitLoading(false);
        }
    };

    const handlePlayAudio = () => {
        if (kitData?.audioBuffer) playAudioBuffer(kitData.audioBuffer);
    }
    
    const handleDownloadAudio = () => {
        if (kitData?.audioBuffer) {
            const url = audioBufferToWavUrl(kitData.audioBuffer);
            downloadFile(url, `voiceover-${kitData.productName}.wav`);
        }
    }

    const ErrorBanner = ({ msg }: { msg: string }) => (
        <div className="p-4 bg-red-900/30 border border-red-800 text-red-200 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{msg}</p>
            </div>
            {msg.includes('Quota') && (
                <button 
                    onClick={() => onViewChange(View.SETTINGS)}
                    className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                    <SettingsIcon className="w-4 h-4" />
                    Configurer Clé API
                </button>
            )}
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Centre d'Espionnage & Automation</h1>
                    <p className="text-slate-400">Langue active : <span className="text-brand-400 font-bold uppercase">{currentLang}</span></p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                     {/* Time Range Filter */}
                     <div className="bg-dark-900 p-1 rounded-xl border border-slate-800 flex">
                        {[
                            { val: '7d', label: '7 jours' },
                            { val: '30d', label: '30 jours' },
                            { val: '6m', label: '6 mois' }
                        ].map((t) => (
                            <button
                                key={t.val}
                                onClick={() => setTimeRange(t.val as TimeRange)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === t.val ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex bg-dark-900 p-1 rounded-xl border border-slate-800">
                        <button 
                            onClick={() => setMode(Mode.AUTO_SCAN)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === Mode.AUTO_SCAN ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Radar className="w-4 h-4" /> Radar Winning
                        </button>
                        <button 
                            onClick={() => setMode(Mode.NICHE_ANALYSIS)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === Mode.NICHE_ANALYSIS ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Search className="w-4 h-4" /> Analyse Niche
                        </button>
                        {mode === Mode.MARKETING_KIT && (
                            <button 
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white shadow ml-2 animate-pulse"
                            >
                                <Wand2 className="w-4 h-4" /> Kit Marketing
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* --- MODE 1: AUTO SCANNER --- */}
            {mode === Mode.AUTO_SCAN && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                     {scanError && <ErrorBanner msg={scanError} />}
                    
                    {winningProducts.length === 0 && (
                        <div className="bg-dark-900 p-8 rounded-2xl border border-slate-800 text-center relative overflow-hidden mb-8">
                             {/* ... Same content as before but prompt is handled in service ... */}
                             <div className="relative z-10">
                                <h2 className="text-2xl font-bold text-white mb-4">Scanner Automatique de Marché</h2>
                                <p className="text-slate-400 max-w-xl mx-auto mb-8">
                                    TikTok, Facebook, Google Trends, Bing & Yahoo.
                                    <span className="block mt-2 text-brand-400 text-sm font-semibold">Filtre : Derniers {timeRange === '7d' ? '7 Jours' : timeRange === '30d' ? '30 Jours' : '6 Mois'}</span>
                                </p>
                                {!scanning && (
                                    <button 
                                        onClick={() => handleScan(false)}
                                        className="bg-brand-600 text-white px-8 py-4 rounded-full font-bold hover:bg-brand-500 transition-all flex items-center gap-3 mx-auto"
                                    >
                                        <Radar className="w-5 h-5" /> Lancer le Radar ({currentLang})
                                    </button>
                                )}
                                {scanning && <div className="text-brand-500 animate-pulse mt-4">Scan en cours...</div>}
                             </div>
                        </div>
                    )}

                    {winningProducts.length > 0 && (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white">Résultats ({winningProducts.length})</h2>
                                <button onClick={() => handleScan(false)} className="text-sm text-slate-500 underline">Reset</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                {winningProducts.map((prod) => (
                                    <div key={`${prod.name}-${prod.rank}`} className="bg-dark-900 border border-slate-800 rounded-2xl p-6 hover:border-brand-500/50 transition-all flex flex-col group relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-xs font-bold text-slate-300 bg-dark-950 px-2 py-1 rounded">#{prod.rank}</span>
                                            <span className="text-green-400 font-bold text-xs flex items-center gap-1"><Zap className="w-3 h-3"/> {prod.viralityScore}</span>
                                        </div>
                                        
                                        {/* Product Image Placeholder or Real if available */}
                                        {prod.originalImageUrl ? (
                                            <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-dark-950">
                                                <img src={prod.originalImageUrl} alt={prod.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                            </div>
                                        ) : null}

                                        <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 min-h-[3.5rem]">{prod.name}</h3>
                                        <p className="text-xs text-slate-500 mb-4 uppercase">{prod.niche}</p>
                                        
                                        <div className="bg-dark-950 p-3 rounded-xl mb-4 text-xs space-y-2">
                                            <div className="flex justify-between"><span className="text-slate-400">Marge</span><span className="text-white">{prod.profitMargin}</span></div>
                                            <div className="flex flex-wrap gap-1 justify-end">
                                                {prod.platforms.map(p => <span key={p} className="bg-slate-800 text-slate-300 px-1 rounded text-[9px]">{p}</span>)}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="mt-auto space-y-2">
                                            <button 
                                                onClick={() => generateKit(prod)}
                                                className="w-full py-2.5 bg-gradient-to-r from-brand-700 to-purple-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:opacity-90 transition-opacity"
                                            >
                                                <Wand2 className="w-3 h-3" /> Créer Kit Pub
                                            </button>
                                            
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    onClick={() => handleAnalysis(prod.name)}
                                                    className="py-2 bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <Microscope className="w-3 h-3" /> Analyser
                                                </button>
                                                <a 
                                                    href={prod.sourceUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="py-2 bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> Source
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center pb-8">
                                <button onClick={() => handleScan(true)} disabled={scanning} className="bg-dark-900 border border-slate-700 text-slate-300 px-8 py-3 rounded-full font-bold hover:border-brand-500 transition-colors flex items-center gap-2">
                                    {scanning ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Charger Plus
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* --- MODE 3: MARKETING KIT (WITH DOWNLOADS) --- */}
            {mode === Mode.MARKETING_KIT && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                     <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setMode(Mode.AUTO_SCAN)} className="text-slate-500 hover:text-white transition-colors">
                                 &larr; Retour
                            </button>
                            <h2 className="text-2xl font-bold text-white">Kit Marketing : <span className="text-brand-400">{kitData?.productName}</span></h2>
                        </div>
                        
                        {/* GLOBAL DOWNLOAD BUTTON */}
                        {!kitLoading && (
                            <button 
                                onClick={() => kitData && downloadKitAsZip(kitData)}
                                className="bg-white text-dark-900 px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
                            >
                                <Package className="w-4 h-4" /> Tout télécharger (.zip)
                            </button>
                        )}
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                         
                         {/* VISUALS */}
                         <div className="lg:col-span-4 space-y-6">
                            {/* Image */}
                            <div className="bg-dark-900 border border-slate-800 rounded-2xl p-4 shadow-xl group relative">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-300"><ImageIcon className="w-4 h-4 text-brand-500" /> Image</div>
                                    {kitData?.imageUrl && (
                                        <button onClick={() => downloadFile(kitData.imageUrl!, `image-${kitData.productName}.png`)} className="p-1.5 bg-slate-800 rounded hover:text-white text-slate-400 transition-colors" title="Télécharger">
                                            <Download className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                <div className="aspect-square bg-dark-950 rounded-xl flex items-center justify-center relative overflow-hidden">
                                    {loadingSteps.image ? <Loader2 className="w-8 h-8 text-brand-500 animate-spin" /> : kitData?.imageUrl ? <img src={kitData.imageUrl} className="w-full h-full object-cover" /> : <span className="text-xs text-red-400">Erreur</span>}
                                </div>
                            </div>

                            {/* Video */}
                            <div className="bg-dark-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-300"><Video className="w-4 h-4 text-purple-500" /> Vidéo</div>
                                    {kitData?.videoUrl && (
                                        <button onClick={() => downloadFile(kitData.videoUrl!, `video-${kitData.productName}.mp4`)} className="p-1.5 bg-slate-800 rounded hover:text-white text-slate-400 transition-colors" title="Télécharger">
                                            <Download className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                <div className="aspect-video bg-dark-950 rounded-xl flex items-center justify-center relative overflow-hidden">
                                    {loadingSteps.video ? <div className="text-center"><Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto"/> <span className="text-xs text-slate-500 mt-2 block">Génération Veo...</span></div> : kitData?.videoUrl ? <video src={kitData.videoUrl} controls className="w-full h-full object-cover" /> : <div className="text-center text-xs text-slate-500">Vidéo non dispo (Check API Key)</div>}
                                </div>
                            </div>
                         </div>

                         {/* STRATEGY */}
                         <div className="lg:col-span-4 space-y-6">
                            <div className="bg-gradient-to-br from-indigo-900/40 to-dark-900 border border-indigo-500/20 rounded-2xl p-6">
                                <h3 className="text-indigo-300 font-bold mb-4 flex items-center gap-2"><Target className="w-4 h-4" /> Stratégie</h3>
                                {loadingSteps.strategy ? <div className="animate-pulse h-20 bg-indigo-500/10 rounded"></div> : (
                                    <>
                                        <div className="mb-4"><p className="text-xs text-indigo-400 font-bold">CIBLE</p><p className="text-sm text-indigo-100">{kitData?.strategy?.targetAudience}</p></div>
                                        <div><p className="text-xs text-indigo-400 font-bold">HOOK</p><p className="text-lg font-bold text-white">"{kitData?.strategy?.hook}"</p></div>
                                    </>
                                )}
                            </div>

                            <div className="bg-dark-900 border border-slate-800 rounded-2xl p-6 relative group">
                                <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2"><Tag className="w-4 h-4" /> Copywriting</h3>
                                {loadingSteps.strategy ? <div className="animate-pulse h-32 bg-slate-800 rounded"></div> : <div className="bg-dark-950 p-4 rounded-xl text-sm text-slate-300 whitespace-pre-wrap font-sans border border-slate-800">{kitData?.strategy?.adCopy}</div>}
                                {!loadingSteps.strategy && <button className="absolute top-6 right-6 text-slate-500 hover:text-white" onClick={() => navigator.clipboard.writeText(kitData?.strategy?.adCopy || '')}><Copy className="w-4 h-4" /></button>}
                            </div>
                         </div>

                         {/* SCRIPT & AUDIO */}
                         <div className="lg:col-span-4 space-y-6">
                             <div className="bg-dark-900 border border-slate-800 rounded-2xl p-6">
                                <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2"><Mic className="w-4 h-4" /> Script & Audio</h3>
                                {loadingSteps.strategy ? <div className="animate-pulse h-40 bg-slate-800 rounded"></div> : (
                                    <div className="space-y-4">
                                        <div className="bg-dark-950 p-4 rounded-xl text-sm text-slate-300 whitespace-pre-wrap font-mono border border-slate-800 max-h-60 overflow-y-auto">{kitData?.strategy?.videoScript}</div>
                                        <div className="bg-dark-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                                            {kitData?.audioBuffer ? (
                                                <>
                                                    <button onClick={handlePlayAudio} className="w-10 h-10 bg-brand-600 hover:bg-brand-500 rounded-full flex items-center justify-center text-white"><Play className="w-4 h-4 fill-current ml-0.5" /></button>
                                                    <div className="flex-1"><p className="text-xs font-semibold text-white">Voix Off</p><p className="text-[10px] text-green-400">Généré</p></div>
                                                    <button onClick={handleDownloadAudio} className="text-slate-400 hover:text-white"><Download className="w-4 h-4" /></button>
                                                </>
                                            ) : loadingSteps.audio ? <Loader2 className="w-5 h-5 animate-spin text-slate-500"/> : <Mic className="w-5 h-5 text-slate-700"/>}
                                        </div>
                                    </div>
                                )}
                             </div>
                         </div>

                     </div>
                </div>
            )}
            
            {/* MODE 2: NICHE ANALYSIS */}
            {mode === Mode.NICHE_ANALYSIS && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                    <div className="mb-6">
                        <button onClick={() => setMode(Mode.AUTO_SCAN)} className="text-slate-500 hover:text-white transition-colors mb-4">
                             &larr; Retour au Radar
                        </button>
                        <div className="flex gap-4 items-center bg-dark-900 p-4 rounded-xl border border-slate-800 shadow-lg">
                            <Search className="text-slate-400 w-5 h-5" />
                            <input 
                                className="bg-transparent border-none outline-none text-white flex-1 placeholder-slate-500 font-medium"
                                placeholder="Entrez une niche (ex: Montres Connectées...)"
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAnalysis(niche)}
                            />
                            <button 
                                onClick={() => handleAnalysis(niche)}
                                disabled={loading || !niche}
                                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-brand-900/20"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Analyser
                            </button>
                        </div>
                    </div>
                    
                    {error && <ErrorBanner msg={error} />}

                    {/* Existing Charts and Data */}
                    {data ? (
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* 1. Score & Keywords (Left Column) */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* Viral Score */}
                                <div className="bg-dark-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-4 opacity-10">
                                         <Activity className="w-32 h-32 text-brand-500" />
                                     </div>
                                     <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-2">Score de Viralité</h3>
                                     <div className="text-6xl font-black text-white mb-2">{data.score}<span className="text-2xl text-slate-500 font-normal">/100</span></div>
                                     <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${data.sentiment === 'Positif' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                         {data.sentiment === 'Positif' ? <TrendingUp className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                                         Sentiment {data.sentiment}
                                     </div>
                                </div>
        
                                {/* Top Keywords */}
                                <div className="bg-dark-900 p-6 rounded-2xl border border-slate-800">
                                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-brand-400" />
                                        Mots-clés ({timeRange})
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {data.keywords?.map((kw, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-dark-950 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-brand-500 hover:text-white transition-colors cursor-default">
                                                #{kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                 {/* Marketing Strategy Summary */}
                                 <div className="bg-gradient-to-br from-indigo-900/40 to-dark-900 p-6 rounded-2xl border border-indigo-500/20">
                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                        <Target className="w-4 h-4 text-indigo-400" />
                                        Stratégie Gagnante
                                    </h3>
                                    <p className="text-sm text-indigo-100 leading-relaxed">
                                        {data.adSpy?.strategy}
                                    </p>
                                </div>
                            </div>
        
                            {/* 2. Charts & Data (Right Column - Spans 2 cols) */}
                            <div className="lg:col-span-2 space-y-6">
                                
                                {/* Sales Growth Chart */}
                                <div className="bg-dark-900 p-6 rounded-2xl border border-slate-800 h-80">
                                    <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-emerald-400" />
                                        Ventes Estimées
                                    </h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.salesData}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="month" stroke="#64748b" tick={{fontSize: 12}} />
                                            <YAxis stroke="#64748b" tick={{fontSize: 12}} />
                                            <Tooltip 
                                                cursor={{fill: '#1e293b'}}
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                            />
                                            <Bar dataKey="sales" name="Ventes" fill="url(#colorSales)" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* New Platform Popularity Section */}
                                <div className="bg-dark-900 p-6 rounded-2xl border border-slate-800">
                                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                        <Share2 className="w-4 h-4 text-brand-400" />
                                        Popularité par Plateforme
                                    </h3>
                                    <div className="space-y-4">
                                        {data.platforms.map((p, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between text-xs mb-1 text-slate-300 font-medium">
                                                    <span>{p.name}</span>
                                                    <span className="text-slate-400">{p.popularity}%</span>
                                                </div>
                                                <div className="h-2 bg-dark-950 rounded-full overflow-hidden border border-slate-800">
                                                    <div 
                                                        style={{ width: `${p.popularity}%` }} 
                                                        className={`h-full rounded-full ${
                                                            p.name.toLowerCase().includes('tiktok') ? 'bg-gradient-to-r from-pink-500 to-cyan-500' :
                                                            p.name.toLowerCase().includes('google') ? 'bg-blue-500' :
                                                            p.name.toLowerCase().includes('amazon') ? 'bg-yellow-500' :
                                                            'bg-brand-600'
                                                        }`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
        
                                {/* Ad Spy Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     {/* Hooks */}
                                     <div className="bg-dark-900 p-6 rounded-2xl border border-slate-800">
                                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-amber-400" />
                                            Top Hooks
                                        </h3>
                                        <ul className="space-y-3">
                                            {data.adSpy?.topHooks.map((hook, i) => (
                                                <li key={i} className="flex gap-3 text-sm text-slate-300">
                                                    <span className="flex-shrink-0 w-5 h-5 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center text-xs font-bold border border-amber-500/20">{i+1}</span>
                                                    "{hook}"
                                                </li>
                                            ))}
                                        </ul>
                                     </div>
        
                                     {/* Platforms & Creatives */}
                                     <div className="bg-dark-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-white font-semibold mb-4">Formats Créatifs</h3>
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {data.adSpy?.creativeTypes.map((type, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700">
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="h-32">
                                             <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={data.timeline}>
                                                    <defs>
                                                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorTrend)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                            <p className="text-xs text-center text-slate-500 mt-2">Intérêt dans le temps</p>
                                        </div>
                                     </div>
                                </div>
        
                            </div>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center py-32 text-slate-500 bg-dark-900/30 rounded-2xl border border-dashed border-slate-800">
                            <BarChart2 className="w-20 h-20 mb-6 opacity-10" />
                            <p className="text-lg font-medium">Analyse Profonde ({timeRange})</p>
                            <p className="text-sm opacity-70">Utilisez le Radar Winning Products pour trouver une idée.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};