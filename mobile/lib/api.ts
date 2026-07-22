import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Android emulator → 10.0.2.2
 * iOS simulator → localhost
 * Device physique → définir EXPO_PUBLIC_API_URL (IP LAN du PC)
 */
function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
      ?.extra?.expoClient?.hostUri;

  if (hostUri && Platform.OS !== 'web') {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_BASE = resolveApiBase();
export const API_URL = `${API_BASE}/api`;

export type AuthUser = {
  id: string;
  email?: string | null;
  telephone?: string | null;
  pseudonyme?: string | null;
  nom?: string | null;
  prenom?: string | null;
  role: string;
  commune_id?: string | null;
  quartier_id?: string | null;
};

export type ApiSuccess<T> = {
  success: boolean;
  message?: string;
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  formData?: FormData;
  query?: Record<string, string | number | undefined | null>;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const { method = 'GET', body, token, formData, query } = options;

  let url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!formData) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: formData ? formData : body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json: ApiSuccess<T> & { message?: string } = { success: false, data: null as T };
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new ApiError(json.message || `Erreur HTTP ${res.status}`, res.status);
  }

  return json;
}

export function coordsFromLocalisation(loc: unknown): { latitude: number; longitude: number } | null {
  if (!loc || typeof loc !== 'object') return null;
  const o = loc as { type?: string; coordinates?: number[]; latitude?: number; longitude?: number };
  if (Array.isArray(o.coordinates) && o.coordinates.length >= 2) {
    return { longitude: Number(o.coordinates[0]), latitude: Number(o.coordinates[1]) };
  }
  if (typeof o.latitude === 'number' && typeof o.longitude === 'number') {
    return { latitude: o.latitude, longitude: o.longitude };
  }
  return null;
}
