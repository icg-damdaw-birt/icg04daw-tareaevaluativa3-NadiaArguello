/**
 * MOVIES STORE - Gestión centralizada de películas (Svelte 5 Runes)
 * 
 * Equivalente a MovieProvider en Flutter.
 * Usa runes para estado reactivo global.
 */

import { api } from './api.service';
import type { Movie, MoviePayload } from './types';

// Estado reactivo global con Svelte 5 runes
let movies = $state<Movie[]>([]);
let loading = $state(false);
let mutating = $state(false);
let error = $state<string | null>(null);

// API pública del store
export const moviesStore = {
  // Getters reactivos
  get movies() { return movies; },
  get loading() { return loading; },
  get mutating() { return mutating; },
  get error() { return error; },

  // Cargar todas las películas
  async loadMovies() {
    loading = true;
    error = null;
    try {
      movies = await api.getMovies();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al cargar películas';
    } finally {
      loading = false;
    }
  },

  // Crear película
  async createMovie(payload: MoviePayload): Promise<boolean> {
    mutating = true;
    error = null;
    try {
      const newMovie = await api.createMovie(payload);
      movies = [...movies, newMovie];
      return true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al crear película';
      return false;
    } finally {
      mutating = false;
    }
  },

  // Actualizar película
  async updateMovie(id: string, payload: MoviePayload): Promise<boolean> {
    mutating = true;
    error = null;
    try {
      const updatedMovie = await api.updateMovie(id, payload);
      movies = movies.map(m => m.id === id ? updatedMovie : m);
      return true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al actualizar película';
      return false;
    } finally {
      mutating = false;
    }
  },

  // Eliminar película
  async deleteMovie(id: string): Promise<boolean> {
    mutating = true;
    error = null;
    try {
      await api.deleteMovie(id);
      movies = movies.filter(m => m.id !== id);
      return true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al eliminar película';
      return false;
    } finally {
      mutating = false;
    }
  },

  // Toggle favorito para una película (marca/desmarca)
  async toggleFavorite(id: string): Promise<boolean> {
    mutating = true;
    error = null;
    try {
      const updatedMovie = await api.toggleFavorite(id);
      movies = movies.map(m => m.id === id ? updatedMovie : m);
      return true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al actualizar favorito';
      return false;
    } finally {
      mutating = false;
    }
  },

 // Calificar película (0-5 estrellas) con optimistic update
  async rateMovie(id: string, rating: number): Promise<boolean> {
    // Validar rating entre 0 y 5
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      error = 'El rating debe ser un número entre 0 y 5';
      return false;
    }

    // Optimistic update: guardar valor anterior por si falla
    const movieIndex = movies.findIndex(m => m.id === id);
    if (movieIndex === -1) {
      error = 'Película no encontrada';
      return false;
    }

    const previousRating = movies[movieIndex].rating;

    mutating = true;
    error = null;
    try {
      // Actualizar inmediatamente en la UI (optimistic)
      movies[movieIndex].rating = rating;

      // Llamar al backend
      const updatedMovie = await api.rateMovie(id, rating);
      // Sincronizar con respuesta del servidor
      movies = movies.map(m => m.id === id ? updatedMovie : m);
      return true;
    } catch (err) {
      // Rollback: restaurar valor anterior si falla
      movies[movieIndex].rating = previousRating;
      error = err instanceof Error ? err.message : 'Error al calificar película';
      return false;
    } finally {
      mutating = false;
    }
  },


  // Limpiar estado
  reset() {
    movies = [];
    loading = false;
    mutating = false;
    error = null;
  },

  clearError() {
    error = null;
  }
};

