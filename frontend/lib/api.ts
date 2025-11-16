/**
 * API Client für Backend-Integration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Transaction {
  date: string;          // ISO date string
  amount: number;        // positive for income, negative for expenses
  category: string;
  description: string;
}

export interface FinanceData {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  monthly_averages: {
    income: number;
    expenses: number;
  };
  categories: Record<string, number>;
  date_range: {
    start: string;
    end: string;
  };
  transaction_count: number;
  transactions: Transaction[];
}

export interface ScenarioProjection {
  month: string;
  projected_income: number;
  projected_expenses: number;
  projected_balance: number;
  cumulative_balance: number;
}

export interface Scenario {
  title: string;
  description: string;
  monthly_savings: number;
  final_balance: number;
  projections: ScenarioProjection[];
  risk_factors: string[];
  opportunities: string[];
  ai_summary: string;
}

export interface AnalysisResponse {
  success: boolean;
  finance_data: FinanceData;
  scenarios: {
    best_case: Scenario;
    worst_case: Scenario;
    realistic_case: Scenario;
  };
  ai_analysis: {
    plausibility: string | null;
    tips: string | null;
  };
  errors: string[];
  warnings: string[];
}

export async function analyzeCSV(file: File, userGoal: string): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_goal', userGoal);

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = 'Unbekannter Fehler';
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch (e) {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.success) {
      throw new Error(data.error || 'Die Analyse war nicht erfolgreich');
    }
    
    return data;
  } catch (error) {
    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Die Anfrage hat zu lange gedauert. Bitte versuche es erneut oder verwende eine kleinere Datei.');
    }
    // Handle network errors
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      throw new Error(`Verbindungsfehler: Backend nicht erreichbar (${API_BASE_URL}). Bitte stelle sicher, dass der Backend-Server läuft.`);
    }
    throw error;
  }
}

export async function healthCheck(): Promise<{ status: string; llm_available: boolean }> {
  const response = await fetch(`${API_BASE_URL}/`);
  return response.json();
}

