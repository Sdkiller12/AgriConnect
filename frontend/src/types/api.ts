export interface FallbackResult {
  label: string;
  score: number;
}

export interface DiagnosticResponse {
  label: string;
  confidence: number;
  culture: string;
  recommandations: string[];
  fallback_used: boolean;
  fallback_results: FallbackResult[] | null;
  warning: string | null;
  image_path: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  source: 'ollama_local' | 'hf_api_fallback' | 'error';
  context_used: string[];
}

export interface PriceTrendResponse {
  culture: string;
  region: string;
  prix_actuel_fcfa_kg: number;
  variation_pct_30j: number;
  tendance: 'hausse' | 'baisse' | 'stable';
  recommandation: string;
}

export interface WeatherDayForecast {
  date: string;
  temp_max: number;
  temp_min: number;
  precipitation_mm: number;
  humidite_pct: number | null;
  alerte_agronomique: string;
}

export interface WeatherResponse {
  region: string;
  forecast: WeatherDayForecast[];
}
