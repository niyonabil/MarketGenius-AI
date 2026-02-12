import { GoogleGenAI, Modality } from '@google/genai';
import JSZip from 'jszip';
import { AIProvider, Language, SearchFilters, TimeRange } from '../types';
import { dbService } from './db';

const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-3-flash-preview',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-latest',
  ollama: 'gpt-oss:120b'
};

const ENV_KEYS: Record<AIProvider, string> = {
  gemini: 'VITE_GEMINI_API_KEY',
  openai: 'VITE_OPENAI_API_KEY',
  anthropic: 'VITE_ANTHROPIC_API_KEY',
  ollama: 'VITE_OLLAMA_API_KEY'
};

function getEnv(name: string): string {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value : '';
}

function getProvider(): AIProvider {
  const selected = dbService.getProvider();
  return selected || 'gemini';
}

function getApiKey(provider: AIProvider): string {
  return dbService.getApiKey(provider) || getEnv(ENV_KEYS[provider]) || '';
}

function getOllamaBaseUrl(): string {
  return dbService.getOllamaBaseUrl() || getEnv('VITE_OLLAMA_BASE_URL') || '/api/ollama';
}

function getOllamaModel(): string {
  return dbService.getOllamaModel() || getEnv('VITE_OLLAMA_MODEL') || DEFAULT_MODELS.ollama;
}


function getOllamaEndpoint(baseUrl: string, endpoint: 'chat' | 'tags'): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  if (cleanBase.startsWith('/api/ollama')) {
    return `${cleanBase}/${endpoint}`;
  }
  return `${cleanBase}/api/${endpoint}`;
}

function buildPrompt(message: string, language: Language): string {
  return `Réponds strictement en ${language}.\n${message}`;
}

const ERROR_MESSAGES: Record<string, Record<Language, string>> = {
  QUOTA: {
    fr: 'Quota API épuisé (429). Veuillez vérifier votre provider et la clé API dans les paramètres.',
    en: 'API quota exhausted (429). Please verify provider and API key in settings.',
    es: 'Cuota de API agotada (429). Verifique el proveedor y la clave API en configuración.',
    de: 'API-Kontingent erschöpft (429). Bitte Provider und API-Schlüssel prüfen.',
    it: 'Quota API esaurita (429). Verifica provider e chiave API nelle impostazioni.'
  },
  GENERIC: {
    fr: "Une erreur est survenue lors de la communication avec l'IA.",
    en: 'An error occurred while communicating with the AI.',
    es: 'Ocurrió un error al comunicarse con la IA.',
    de: 'Ein Fehler ist bei der Kommunikation mit der KI aufgetreten.',
    it: "Si è verificato un errore durante la comunicazione con l'IA."
  }
};

async function withRetry<T>(fn: () => Promise<T>, language: Language = 'fr', retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.message?.includes('429') || error?.message?.includes('quota'))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, language, retries - 1, delay * 2);
    }

    if (error?.message?.includes('429')) {
      throw new Error(ERROR_MESSAGES.QUOTA[language]);
    }
    throw new Error(error?.message || ERROR_MESSAGES.GENERIC[language]);
  }
}

async function generateTextWithProvider(prompt: string, language: Language, forceGeminiSearch = false): Promise<string> {
  const provider = forceGeminiSearch ? 'gemini' : getProvider();

  if (provider === 'gemini') {
    const apiKey = getApiKey('gemini');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: DEFAULT_MODELS.gemini,
      contents: buildPrompt(prompt, language),
      config: forceGeminiSearch ? { tools: [{ googleSearch: {} }] } : undefined
    });
    return response.text || '';
  }

  if (provider === 'openai') {
    const apiKey = getApiKey('openai');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODELS.openai,
        messages: [{ role: 'user', content: buildPrompt(prompt, language) }],
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'anthropic') {
    const apiKey = getApiKey('anthropic');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: DEFAULT_MODELS.anthropic,
        max_tokens: 2048,
        messages: [{ role: 'user', content: buildPrompt(prompt, language) }]
      })
    });

    if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  const baseUrl = getOllamaBaseUrl();
  const token = getApiKey('ollama');
  const commonHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(getOllamaEndpoint(baseUrl, 'chat'), {
    method: 'POST',
    headers: commonHeaders,
    body: JSON.stringify({
      model: getOllamaModel(),
      stream: false,
      messages: [{ role: 'user', content: buildPrompt(prompt, language) }]
    })
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json();
  return data.message?.content || '';
}

async function generateJsonWithProvider(prompt: string, language: Language, fallback: any): Promise<any> {
  const text = await generateTextWithProvider(`${prompt}\nRetourne UNIQUEMENT un JSON valide.`, language);
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
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

async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function createWavBuffer(buffer: AudioBuffer): ArrayBuffer {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i, sample;
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return bufferArr;
}


export const listOllamaCloudModels = async (): Promise<string[]> => {
  const baseUrl = getOllamaBaseUrl();
  const token = getApiKey('ollama');
  const response = await fetch(getOllamaEndpoint(baseUrl, 'tags'), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) throw new Error(`Ollama tags error: ${response.status}`);
  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  return models.map((m: any) => m?.model).filter((name: any) => typeof name === 'string');
};

export const searchProducts = async (query: string, filters?: SearchFilters, language: Language = 'fr'): Promise<string> => {
  const promptContext = `Agis comme un expert senior en sourcing et marketing e-commerce.\nOBJECTIF: Analyse comparative détaillée du produit "${query}".\n${filters?.category ? `Focus catégorie: ${filters.category}.` : ''}`;
  return withRetry(() => generateTextWithProvider(promptContext, language, true), language);
};

export const analyzeTrends = async (niche: string, language: Language = 'fr', timeRange: TimeRange = '30d'): Promise<any> => {
  const prompt = `Tu es un outil d'espionnage publicitaire. Génère des données d'analyse pour la niche: "${niche}" sur ${timeRange}.\nStructure attendue: { sentiment, score, platforms, timeline, keywords, salesData, adSpy }`;
  return withRetry(() => generateJsonWithProvider(prompt, language, {}), language);
};

export const scanWinningProducts = async (excludeNames: string[] = [], language: Language = 'fr', timeRange: TimeRange = '7d'): Promise<any[]> => {
  const prompt = `Trouve 12 nouveaux produits gagnants (${timeRange}) en évitant: ${excludeNames.join(', ')}. Retourne un JSON array avec rank,name,niche,viralityScore,platforms,profitMargin,reason,originalImageUrl.`;
  const parsed = await withRetry(() => generateJsonWithProvider(prompt, language, []), language);
  const list = Array.isArray(parsed) ? parsed : [];
  return list.map((p: any) => ({
    ...p,
    sourceUrl: p?.name ? `https://www.google.com/search?q=${encodeURIComponent(p.name)}&tbm=shop` : undefined,
    originalImageUrl: p?.originalImageUrl?.startsWith('http') ? p.originalImageUrl : undefined
  }));
};

export const generateCampaignStrategy = async (productName: string, language: Language = 'fr'): Promise<any> => {
  const prompt = `Produit: "${productName}". Retourne un JSON: { targetAudience, hook, adCopy, videoScript, imagePrompt, videoPrompt }.`;
  return withRetry(() => generateJsonWithProvider(prompt, language, {}), language);
};

export const generateMarketingImage = async (prompt: string, referenceImageUrl?: string, language: Language = 'fr'): Promise<string> => {
  return withRetry(async () => {
    const apiKey = getApiKey('gemini');
    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [];
    if (referenceImageUrl) {
      const base64Data = await fetchImageBase64(referenceImageUrl);
      if (base64Data) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
      }
    }

    parts.push({ text: `Professional product photography, studio lighting, high quality, 4k. Product description: ${prompt}` });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { imageConfig: { aspectRatio: '1:1' } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }

    throw new Error('No image generated');
  }, language);
};

export const generateMarketingVideo = async (prompt: string, language: Language = 'fr'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic product commercial, high quality: ${prompt}`,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error('Video generation failed');

    const vidResponse = await fetch(`${downloadLink}&key=${getApiKey('gemini')}`);
    const blob = await vidResponse.blob();
    return URL.createObjectURL(blob);
  }, language);
};

export const generateMarketingAudio = async (text: string, language: Language = 'fr'): Promise<AudioBuffer> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error('No audio generated');

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
  }, language);
};

export const generateMarketingText = async (prompt: string, language: Language = 'fr'): Promise<string> => {
  return withRetry(() => generateTextWithProvider(`Expert Copywriter e-commerce. Produit: "${prompt}". Rédige un texte AIDA optimisé.`, language), language);
};

export const playAudioBuffer = (buffer: AudioBuffer) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
};

export const downloadKitAsZip = async (kit: any) => {
  const zip = new JSZip();
  const folder = zip.folder(`marketing-kit-${kit.productName.replace(/\s+/g, '-')}`);
  if (!folder) return;

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
  folder.file('strategie-marketing.txt', strategyText);

  if (kit.imageUrl) {
    const imgData = kit.imageUrl.split(',')[1];
    folder.file('visuel-produit.png', imgData, { base64: true });
  }

  if (kit.audioBuffer) {
    const wavBuffer = createWavBuffer(kit.audioBuffer);
    folder.file('voiceover.wav', wavBuffer);
  }

  if (kit.videoUrl) {
    try {
      const vidBlob = await fetch(kit.videoUrl).then(r => r.blob());
      folder.file('publicite-video.mp4', vidBlob);
    } catch (e) {
      console.error('Could not add video to zip', e);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = `kit-${kit.productName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadFile = (url: string, filename: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};

export const audioBufferToWavUrl = (buffer: AudioBuffer): string => {
  const wavBuffer = createWavBuffer(buffer);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};
