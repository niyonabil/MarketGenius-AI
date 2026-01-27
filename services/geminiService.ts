import { GoogleGenAI, Type, Modality } from "@google/genai";
import JSZip from "jszip";
import { Language, TimeRange } from "../types";

// Helpers for Audio
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Helper to fetch image and convert to base64 (handles CORS gracefully by returning null)
async function fetchImageBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                resolve(base64.split(',')[1]); 
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Could not fetch reference image due to CORS:", e);
        return null;
    }
}

// Helper to convert AudioBuffer to WAV ArrayBuffer
function createWavBuffer(buffer: AudioBuffer): ArrayBuffer {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for(i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while(pos < buffer.length) {
        for(i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
            view.setInt16(44 + offset, sample, true);
            offset += 2;
        }
        pos++;
    }

    return bufferArr;

    function setUint16(data: any) {
        view.setUint16(pos, data, true);
        pos += 2;
    }
    function setUint32(data: any) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

// 1. Market Research with Google Search Grounding
export interface SearchFilters {
  platform?: string;
  priceRange?: string;
  category?: string;
}

export const searchProducts = async (query: string, filters?: SearchFilters, language: Language = 'fr'): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let promptContext = `Agis comme un expert senior en sourcing e-commerce. Langue de réponse : ${language}.
    
    TACHE : Analyse le produit ou la niche "${query}" en comparant les marchés Chinois, Européens et Américains.
    
    INSTRUCTIONS DE RECHERCHE :
    1. Cherche les fournisseurs en CHINE (AliExpress, Alibaba, Temu).
    2. Cherche les concurrents en EUROPE et USA (Amazon, eBay).
    3. Analyse les tendances sur Google, Bing et Yahoo Search pour ce produit.
    
    FORMAT DE RÉPONSE ATTENDU (Markdown Strict) :
    
    ## 1. Tableau Comparatif Global
    | Marché | Plateforme | Prix Moyen | Lien Produit (URL) |
    
    ## 2. Analyse Rentabilité & Moteurs de Recherche
    * **Prix d'achat vs Revente**.
    * **Volume de recherche** (Google/Bing/Yahoo) : Estimation de la popularité.

    ## 3. Verdict
    * "Winning Product" ou "Saturé" ?

    ${filters?.category ? `Focus catégorie : ${filters.category}.` : ''}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: promptContext,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text || "Aucune information trouvée.";
  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
};

// 2. Trend Analysis Data Generation
export const analyzeTrends = async (niche: string, language: Language = 'fr', timeRange: TimeRange = '30d'): Promise<any> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let timeInstruction = "";
    if (timeRange === '7d') timeInstruction = "Basé sur les données des 7 derniers jours.";
    if (timeRange === '30d') timeInstruction = "Basé sur les données des 30 derniers jours.";
    if (timeRange === '6m') timeInstruction = "Basé sur l'historique des 6 derniers mois.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Tu es un outil d'espionnage publicitaire. Langue du JSON : ${language}.
      Génère des données d'analyse pour la niche : "${niche}".
      ${timeInstruction}
      
      Retourne UNIQUEMENT du JSON valide.
      
      Structure attendue :
      {
        "sentiment": "Positif/Neutre/Négatif",
        "score": 85,
        "platforms": [
             {"name": "TikTok", "popularity": 90},
             {"name": "Google Search", "popularity": 60},
             {"name": "Bing/Yahoo", "popularity": 40}
        ],
        "timeline": [{"name": "Période 1", "value": 20}, ...],
        "keywords": ["mot clé 1", ...],
        "salesData": [{"month": "Mois/Semaine", "sales": 120}, ...],
        "adSpy": {
            "topHooks": ["Hook 1", ...],
            "creativeTypes": ["UGC", ...],
            "strategy": "Stratégie..."
        }
      }`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Trend Error:", error);
    throw error;
  }
}

// 2.5 Auto-Scan Winning Products (Multi-Engine)
export const scanWinningProducts = async (excludeNames: string[] = [], language: Language = 'fr', timeRange: TimeRange = '7d'): Promise<any[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const excludeList = excludeNames.slice(-50).join(", ");
        
        let timePrompt = "Actuellement tendance (7 derniers jours)";
        if (timeRange === '30d') timePrompt = "Tendance stable du dernier mois";
        if (timeRange === '6m') timePrompt = "Best-sellers constants des 6 derniers mois";

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", 
            contents: `Agis comme un algorithme de détection de produits viraux. Langue de sortie : ${language}.
            Contexte temporel : ${timePrompt}.
            
            SOURCES DE DONNÉES :
            1. TikTok Creative Center & Facebook Ads Library (Social).
            2. **Google Trends, Bing Search Trends, Yahoo Trending** (Search Engines).
            3. AliExpress Dropshipping Center (Marketplace).
            
            Identifie 12 NOUVEAUX produits qui fonctionnent bien.
            Ne retourne PAS : ${excludeList}.
            
            IMPORTANT: Pour chaque produit, trouve un lien source REEL (AliExpress, Amazon, ou Site Dropshipping) et une URL d'image valide si possible.
            
            Retourne UNIQUEMENT une liste JSON stricte :
            [{
                "rank": 1,
                "name": "Nom produit",
                "niche": "Catégorie",
                "viralityScore": 95,
                "platforms": ["TikTok", "Google", "Bing"],
                "profitMargin": "x3",
                "reason": "Pourquoi c'est viral ?",
                "sourceUrl": "https://...",
                "originalImageUrl": "https://..." (URL d'image jpg/png si trouvée, sinon vide)
            }]
            `,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
            }
        });

        const parsed = JSON.parse(response.text || "[]");
        const list = Array.isArray(parsed) ? parsed : (parsed.products || []);
        
        // Sanitize check
        return list.map((p: any) => ({
            ...p,
            sourceUrl: p.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(p.name)}`,
            originalImageUrl: p.originalImageUrl?.startsWith('http') ? p.originalImageUrl : undefined
        }));

    } catch (error) {
        console.error("Scan Error:", error);
        throw error;
    }
}

// 2.6 Strategy Generation
export const generateCampaignStrategy = async (productName: string, language: Language = 'fr'): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Directeur Marketing IA. Produit: "${productName}". Langue: ${language}.
            
            JSON requis :
            {
                "targetAudience": "Cible",
                "hook": "Phrase choc",
                "adCopy": "Texte pub complet (AIDA)",
                "videoScript": "Script TikTok (Texte à lire seulement)",
                "imagePrompt": "Prompt image (en Anglais pour meilleure qualité, décris le produit visuellement)",
                "videoPrompt": "Prompt vidéo (en Anglais pour meilleure qualité)"
            }
            `,
            config: {
                responseMimeType: "application/json",
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Strategy Gen Error", error);
        throw error;
    }
}

// 3. Image Generation (Text-to-Image OR Image-to-Image)
export const generateMarketingImage = async (prompt: string, referenceImageUrl?: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let parts: any[] = [];

    // Attempt to load reference image if provided
    if (referenceImageUrl) {
        const base64Data = await fetchImageBase64(referenceImageUrl);
        if (base64Data) {
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg", // Assuming jpeg, model handles png too
                    data: base64Data
                }
            });
            // Update prompt to ask to modify/improve the input image
            parts.push({ text: `Make a high quality professional product photography based on this product image. Studio lighting, 4k. Context: ${prompt}` });
        } else {
            // Fallback if fetch failed
            parts.push({ text: `Professional product photography, studio lighting, high quality, 4k. Product description: ${prompt}` });
        }
    } else {
        parts.push({ text: `Professional product photography, studio lighting, high quality, 4k. Product description: ${prompt}` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

// 4. Video Generation (Veo)
export const generateMarketingVideo = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic product commercial, high quality: ${prompt}`,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed");
    
    const vidResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await vidResponse.blob();
    return URL.createObjectURL(blob);
};

// 5. Audio Generation
export const generateMarketingAudio = async (text: string): Promise<AudioBuffer> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  return await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
};

// 6. Text Generation
export const generateMarketingText = async (prompt: string, language: Language = 'fr'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Expert Copywriter e-commerce. Langue : ${language}. Produit : "${prompt}".
    Rédige un texte AIDA optimisé.`,
  });
  return response.text || "Erreur texte.";
};

// 7. Helpers
export const playAudioBuffer = (buffer: AudioBuffer) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
};

export const downloadKitAsZip = async (kit: any) => {
    const zip = new JSZip();
    const folder = zip.folder(`marketing-kit-${kit.productName.replace(/\s+/g, '-')}`);
    
    if (!folder) return;

    // 1. Text Strategy
    const strategyText = `
PRODUIT: ${kit.productName}
--------------------------------
CIBLE: ${kit.strategy.targetAudience}
HOOK: ${kit.strategy.hook}

PUBLICITÉ (COPY):
${kit.strategy.adCopy}

SCRIPT VIDÉO:
${kit.strategy.videoScript}

PROMPTS UTILISÉS:
Image: ${kit.strategy.imagePrompt}
Vidéo: ${kit.strategy.videoPrompt}
    `;
    folder.file("strategie-marketing.txt", strategyText);

    // 2. Image
    if (kit.imageUrl) {
        const imgData = kit.imageUrl.split(',')[1];
        folder.file("visuel-produit.png", imgData, {base64: true});
    }

    // 3. Audio (WAV)
    if (kit.audioBuffer) {
        const wavBuffer = createWavBuffer(kit.audioBuffer);
        folder.file("voiceover.wav", wavBuffer);
    }

    // 4. Video (MP4)
    if (kit.videoUrl) {
        try {
            // Ensure we fetch from the Blob URL
            const vidBlob = await fetch(kit.videoUrl).then(r => r.blob());
            folder.file("publicite-video.mp4", vidBlob);
        } catch (e) {
            console.error("Could not add video to zip", e);
        }
    }

    // Generate Zip
    const content = await zip.generateAsync({type: "blob"});
    const url = URL.createObjectURL(content);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `kit-${kit.productName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
};

// Helper to download single file
export const downloadFile = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
}

// Audio Buffer to Wav/Blob URL helper for download
export const audioBufferToWavUrl = (buffer: AudioBuffer): string => {
    const wavBuffer = createWavBuffer(buffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
}