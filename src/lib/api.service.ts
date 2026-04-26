import { authToken } from './auth.store.svelte';
import type {
  ApiErrorPayload,
  Credentials,
  LoginResponse,
  Movie,
  MoviePayload,
  RegisterPayload,
} from './types';

// Configuración base del servicio API
const FALLBACK_API_URL = 'http://localhost:3000';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean; // Si incluir token de autenticación
}

// Excepción personalizada para errores de API
export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.details = options?.details;
  }
}

// URL base
function sanitizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return FALLBACK_API_URL;
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

// Configuración SvelteKit
const API_BASE_URL = sanitizeBaseUrl(
  import.meta.env.PUBLIC_API_URL ?? FALLBACK_API_URL
);

// Wrapper HTTP
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers = new Headers();

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = authToken.value;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError('No se pudo conectar con el servidor.', { details: error });
  }

  let payload: unknown = null;
  const isJson = response.headers.get('content-type')?.includes('application/json');

  if (response.status !== 204 && isJson) {
    try {
      payload = await response.json();
    } catch (error) {
      throw new ApiError('El servidor devolvió una respuesta inválida.', {
        status: response.status,
        details: error,
      });
    }
  } else if (response.status !== 204) {
    payload = await response.text();
  }

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as ApiErrorPayload;
    const serverMessage =
      typeof errorPayload === 'object'
        ? errorPayload.error ?? errorPayload.message
        : undefined;

    throw new ApiError(serverMessage ?? 'Ocurrió un error inesperado.', {
      status: response.status,
      details: payload,
    });
  }

  return payload as T;
}

// API pública
export const api = {
  login: (credentials: Credentials) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: credentials,
      auth: false
    }),

  register: (payload: RegisterPayload) =>
    request<void>('/api/auth/register', {
      method: 'POST',
      body: payload,
      auth: false
    }),

  getMovies: () =>
    request<Movie[]>('/api/movies'),

  createMovie: (payload: MoviePayload) =>
    request<Movie>('/api/movies', {
      method: 'POST',
      body: payload
    }),

  updateMovie: (id: string, payload: MoviePayload) =>
    request<Movie>(`/api/movies/${id}`, {
      method: 'PUT',
      body: payload
    }),

  deleteMovie: (id: string) =>
    request<void>(`/api/movies/${id}`, {
      method: 'DELETE'
    }),

  // Favoritos
  toggleFavorite: (id: string) =>
    request<Movie>(`/api/movies/${id}/favorite`, {
      method: 'PATCH'
    }),

  // ⭐ Rating (CORREGIDO)
  rateMovie: (id: string, rating: number) =>
    request<Movie>(`/api/movies/${id}/rate`, {
      method: 'PATCH',
      body: { rating }
    }),
};