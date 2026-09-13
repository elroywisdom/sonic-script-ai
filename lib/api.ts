function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    // If page is HTTPS but backend URL is HTTP, browser blocks it as Mixed Content.
    // In that case, use relative /api/v1 which Next.js rewrites server-side to the backend!
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
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
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
      error: err?.message || 'Network request failed',
    };
  }
}
