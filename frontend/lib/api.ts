/**
 * API Client für Backend-Integration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Token management
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
};

// Helper to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

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
    scenario_analysis: string | null;
    summary: string | null;
  };
  errors: string[];
  warnings: string[];
}

// Auth interfaces
export interface UserRegister {
  email: string;
  password: string;
  full_name?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string;
  full_name?: string;
}

export interface UserInfo {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
  profession?: string;
  about_me?: string;
  financial_goals?: string;
  quiz_profile?: Record<string, string>;
  is_active: boolean;
}

export interface UserUpdate {
  full_name?: string;
  profession?: string;
  about_me?: string;
  financial_goals?: string;
  quiz_profile?: Record<string, string>;
}

export interface QuizProfilePayload {
  quiz_profile: Record<string, string>;
  profession?: string;
}

export interface SuggestedQuestions {
  questions: string[];
}

// Helper function to safely parse JSON response
async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}`);
  }
  return response.json();
}

// Auth API functions
export async function register(userData: UserRegister): Promise<TokenResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      try {
        const errorData = await safeJsonParse(response);
        throw new Error(errorData.detail || 'Registration failed');
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('Expected JSON')) {
          throw new Error(`Backend returned non-JSON response. Check if backend is running at ${API_BASE_URL}`);
        }
        throw parseError;
      }
    }

    const data = await safeJsonParse(response);
    setToken(data.access_token);
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Please check if the server is running.`);
    }
    throw error;
  }
}

export async function login(userData: UserLogin): Promise<TokenResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      try {
        const errorData = await safeJsonParse(response);
        throw new Error(errorData.detail || 'Login failed');
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('Expected JSON')) {
          throw new Error(`Backend returned non-JSON response. Check if backend is running at ${API_BASE_URL}`);
        }
        throw parseError;
      }
    }

    const data = await safeJsonParse(response);
    setToken(data.access_token);
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Please check if the server is running.`);
    }
    throw error;
  }
}

export async function getCurrentUser(): Promise<UserInfo> {
  try {
    const token = getToken()
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    } else {
      throw new Error('No token found')
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        throw new Error('Unauthorized');
      }
      try {
        const errorData = await safeJsonParse(response);
        throw new Error(errorData.detail || 'Failed to get user info');
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('Expected JSON')) {
          throw new Error(`Backend returned non-JSON response. Check if backend is running at ${API_BASE_URL}`);
        }
        throw parseError;
      }
    }

    return safeJsonParse(response);
  } catch (error) {
    // Handle network errors (server not available, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Backend server is not available. Please make sure the server is running at ${API_BASE_URL}`);
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  removeToken();
}

export async function uploadAvatar(file: File): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/auth/avatar`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload avatar');
  }

  return response.json();
}

export async function updateUserProfile(data: UserUpdate): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update profile');
  }

  return response.json();
}

export async function resetUserProfile(): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile/reset`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to reset profile');
  }

  return response.json();
}

export async function saveQuizProfile(payload: QuizProfilePayload): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/api/quiz/profile`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to save quiz profile');
  }

  return response.json();
}

export async function getSuggestedQuestions(): Promise<SuggestedQuestions> {
  const response = await fetch(`${API_BASE_URL}/api/user/suggested-questions`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { questions: [] };
    }
    return { questions: [] };
  }

  return response.json();
}

export async function getTipDetails(
  tipTitle: string,
  tipDescription: string,
  financeData: FinanceData,
  userGoal?: string
): Promise<{ details: string }> {
  const response = await fetch(`${API_BASE_URL}/api/tips/details`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tip_title: tipTitle,
      tip_description: tipDescription,
      finance_data: financeData,
      user_goal: userGoal,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to get tip details');
  }

  return response.json();
}

// Analysis History interfaces
export interface AnalysisHistoryItem {
  id: number;
  title: string;
  user_goal?: string;
  created_at: string;
  updated_at?: string;
}

// Analysis History API functions
export async function getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/history`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to get analysis history');
  }

  return response.json();
}

export async function getAnalysisById(id: number): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/${id}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 404) {
      throw new Error('Analysis not found');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to get analysis');
  }

  return response.json();
}

export async function updateAnalysis(id: number, title: string): Promise<AnalysisHistoryItem> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 404) {
      throw new Error('Analysis not found');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update analysis');
  }

  return response.json();
}

export async function deleteAnalysis(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 404) {
      throw new Error('Analysis not found');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete analysis');
  }

  return response.json();
}

export async function analyzeCSV(file: File, userGoal: string, monthsAhead: number = 12): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_goal', userGoal);
  formData.append('months_ahead', monthsAhead.toString());

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = 'Unbekannter Fehler';
      try {
        const errorData = await safeJsonParse(response);
        errorDetail = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch (e) {
        if (e instanceof Error && e.message.includes('Expected JSON')) {
          errorDetail = `Backend returned non-JSON response (${response.status}). Check if backend is running at ${API_BASE_URL}`;
        } else {
          errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
      throw new Error(errorDetail);
    }

    const data = await safeJsonParse(response);
    
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

