export enum View {
  DASHBOARD = 'DASHBOARD',
  RESEARCH = 'RESEARCH',
  ASSETS = 'ASSETS',
  TRENDS = 'TRENDS',
  SETTINGS = 'SETTINGS'
}

export enum AssetType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  TEXT = 'TEXT'
}

export type Language = 'fr' | 'en' | 'es' | 'de' | 'it';
export type TimeRange = '7d' | '30d' | '6m';
export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama';

export interface AppSettings {
  language: Language;
  enableVeo: boolean;
}

export interface SearchFilters {
  platform?: string;
  priceRange?: string;
  category?: string;
}

export interface ProductAnalysis {
  productName: string;
  priceRange: string;
  competitors: string[];
  platformAnalysis: {
    amazon: string;
    socialMedia: string;
    search: string;
  };
  marketingAngle: string;
  verdict: string;
}

export interface WinningProduct {
  rank: number;
  name: string;
  niche: string;
  viralityScore: number;
  platforms: string[];
  profitMargin: string;
  reason: string;
  sourceUrl?: string;
  originalImageUrl?: string;
}

export interface MarketingKit {
  productName: string;
  strategy: {
    targetAudience: string;
    hook: string;
    adCopy: string;
    videoScript: string;
    imagePrompt: string;
    videoPrompt: string;
  };
  imageUrl?: string;
  videoUrl?: string;
  audioBuffer?: AudioBuffer;
}

export interface TrendData {
  name: string;
  value: number;
  sentiment: string;
  score: number;
  keywords: string[];
  salesData: { month: string; sales: number }[];
  adSpy: {
    topHooks: string[];
    creativeTypes: string[];
    strategy: string;
  };
  platforms: { name: string; popularity: number }[];
  timeline: { name: string; value: number }[];
}

export interface GeneratedAsset {
  type: AssetType;
  url: string; // Blob URL or Data URI
  prompt: string;
  createdAt: number;
}
