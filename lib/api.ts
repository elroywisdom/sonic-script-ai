export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const envUrl = process.env.NEXT_PUBLIC_API_URL;

    // In production / live platform (non-localhost):
    // If NEXT_PUBLIC_API_URL is missing, points to localhost, or is HTTP while page is HTTPS:
    // Route through relative /api/v1 which Next.js rewrites server-side to the real backend!
    if (!isLocalhost) {
      if (
        !envUrl ||
        envUrl.includes('localhost') ||
        envUrl.includes('127.0.0.1') ||
        (isHttps && envUrl.startsWith('http://'))
      ) {
        return '/api/v1';
      }
    }

    // If page is HTTPS but backend URL is HTTP, browser blocks it as Mixed Content.
    if (isHttps && envUrl && envUrl.startsWith('http://')) {
      return '/api/v1';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sonic_token') : null;
  const baseUrl = getApiBaseUrl();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`;
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data: ApiResponse<T>;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: text || `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network request failed. Please check your connection.',
    };
  }
}

export async function apiUpload<T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sonic_token') : null;
  const baseUrl = getApiBaseUrl();

  const headers: HeadersInit = {
    // Note: Do NOT set Content-Type header with FormData so browser sets correct boundary
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const text = await res.text();
    let data: ApiResponse<T>;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: text || `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network request failed. Please check your connection.',
    };
  }
}
