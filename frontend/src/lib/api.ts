import {
  DiagnosticResponse,
  ChatResponse,
  ChatMessage,
  PriceTrendResponse,
  WeatherResponse
} from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithTimeout(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 30000 // 30 secondes
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`La requête a dépassé le délai d'attente maximum (${timeoutMs / 1000}s). Le serveur local est peut-être ralenti.`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

export const api = {
  /**
   * Diagnostic d'une plante par photo
   */
  async diagnosePlant(imageFile: File, culture: string = 'cacao'): Promise<DiagnosticResponse> {
    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      const response = await fetchWithTimeout(
        `/api/diagnostic?culture=${encodeURIComponent(culture)}`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur lors de l'analyse de l'image.");
      }

      return await response.json();
    } catch (error: any) {
      console.error('Erreur API diagnosePlant:', error);
      throw new Error(error.message || "Impossible de contacter le serveur de diagnostic.");
    }
  },

  /**
   * Pré-charge en RAM le modèle d'une culture sur le serveur
   */
  async prewarmModel(culture: string = 'cacao'): Promise<any> {
    try {
      const response = await fetchWithTimeout(
        `/api/diagnostic/prewarm?culture=${encodeURIComponent(culture)}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur lors du pré-chargement du modèle.");
      }

      return await response.json();
    } catch (error: any) {
      console.error('Erreur API prewarmModel:', error);
      throw new Error(error.message || "Impossible de pré-charger le modèle.");
    }
  },

  /**
   * Chat avec l'assistant RAG
   */
  async sendMessageToAssistant(message: string, history: ChatMessage[]): Promise<ChatResponse> {
    try {
      const response = await fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, history })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur de communication avec l'assistant.");
      }

      return await response.json();
    } catch (error: any) {
      console.error('Erreur API sendMessageToAssistant:', error);
      throw new Error(error.message || "L'assistant est temporairement indisponible.");
    }
  },

  /**
   * Prix des marchés agricoles
   */
  async getMarketPrice(culture: string, region: string): Promise<PriceTrendResponse> {
    try {
      const response = await fetchWithTimeout(
        `/api/prix?culture=${encodeURIComponent(culture)}&region=${encodeURIComponent(region)}`
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur de récupération du cours du marché.");
      }

      return await response.json();
    } catch (error: any) {
      console.error('Erreur API getMarketPrice:', error);
      throw new Error(error.message || "Impossible de récupérer les prix.");
    }
  },

  /**
   * Prévisions météo régionales
   */
  async getWeather(region: string): Promise<WeatherResponse> {
    try {
      const response = await fetchWithTimeout(`/api/meteo?region=${encodeURIComponent(region)}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur de récupération des prévisions météo.");
      }

      return await response.json();
    } catch (error: any) {
      console.error('Erreur API getWeather:', error);
      throw new Error(error.message || "Météo indisponible hors ligne.");
    }
  },

  /**
   * Statut de santé de l'API (outils de debug de démo)
   */
  async getHealthStatus(): Promise<any> {
    try {
      const response = await fetchWithTimeout('/api/health', {}, 5000);
      if (!response.ok) throw new Error("API down");
      return await response.json();
    } catch (error) {
      return {
        status: "OFFLINE",
        database: "DOWN",
        ollama_local: "DOWN",
        internet_connection: "DISCONNECTED",
        model_configured: "unknown"
      };
    }
  }
};
export default api;
