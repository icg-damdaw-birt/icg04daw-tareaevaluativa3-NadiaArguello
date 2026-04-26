/**
 * TESTS DEL MOVIES STORE (Svelte 5 Runes)
 * 
 * Tests para las operaciones CRUD de películas.
 * El store consume api.service para las llamadas HTTP.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de $app/environment ANTES de importar el store
vi.mock('$app/environment', () => ({ browser: true }));

// Mock del api.service — mockeamos los métodos que usa el store
vi.mock('./api.service', () => ({
  api: {
    getMovies: vi.fn(),
    createMovie: vi.fn(),
    updateMovie: vi.fn(),
    deleteMovie: vi.fn(),
    toggleFavorite: vi.fn(),
    rateMovie: vi.fn(), // ⭐ NUEVO
  }
}));

// Mock de localStorage (requerido por auth.store.svelte que importa api.service)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Importar DESPUÉS de configurar los mocks
import { moviesStore } from './movies.store.svelte';
import { api } from './api.service';
import type { Movie, MoviePayload } from './types';

// ── Datos de prueba ──────────────────────────────────────────────
const mockMovies: Movie[] = [
  { id: '1', title: 'Inception', director: 'Christopher Nolan', year: 2010 },
  { id: '2', title: 'The Matrix', director: 'Wachowski Sisters', year: 1999 },
  { id: '3', title: 'Pulp Fiction', director: 'Quentin Tarantino', year: 1994 },
];

const newPayload: MoviePayload = {
  title: 'Interstellar',
  director: 'Christopher Nolan',
  year: 2014,
};
const createdMovie: Movie = { id: '4', ...newPayload };

const updatePayload: MoviePayload = {
  title: "Inception (Director's Cut)",
  director: 'Christopher Nolan',
  year: 2010,
};
const updatedMovie: Movie = { id: '1', ...updatePayload };

// ── Tests ────────────────────────────────────────────────────────
describe('Movies Store (Svelte 5 Runes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moviesStore.reset();
  });

  // ─── loadMovies ────────────────────────────────────────────────
  describe('loadMovies()', () => {
    it('debería cargar las películas desde la API', async () => {
      vi.mocked(api.getMovies).mockResolvedValue(mockMovies);

      await moviesStore.loadMovies();

      expect(api.getMovies).toHaveBeenCalledOnce();
      expect(moviesStore.movies).toEqual(mockMovies);
    });
  });

  // ─── createMovie ──────────────────────────────────────────────
  describe('createMovie()', () => {
    it('debería crear una película y agregarla al store', async () => {
      vi.mocked(api.getMovies).mockResolvedValue([...mockMovies]);
      await moviesStore.loadMovies();

      vi.mocked(api.createMovie).mockResolvedValue(createdMovie);

      const ok = await moviesStore.createMovie(newPayload);

      expect(api.createMovie).toHaveBeenCalledWith(newPayload);
      expect(ok).toBe(true);
      expect(moviesStore.movies).toContainEqual(createdMovie);
    });
  });

  // ─── updateMovie ──────────────────────────────────────────────
  describe('updateMovie()', () => {
    it('debería actualizar una película existente en el store', async () => {
      vi.mocked(api.getMovies).mockResolvedValue([...mockMovies]);
      await moviesStore.loadMovies();

      vi.mocked(api.updateMovie).mockResolvedValue(updatedMovie);

      const ok = await moviesStore.updateMovie('1', updatePayload);

      expect(api.updateMovie).toHaveBeenCalledWith('1', updatePayload);
      expect(ok).toBe(true);

      const movie = moviesStore.movies.find(m => m.id === '1');
      expect(movie?.title).toBe("Inception (Director's Cut)");
    });
  });

  // ─── deleteMovie ──────────────────────────────────────────────
  describe('deleteMovie()', () => {
    it('debería eliminar una película del store', async () => {
      vi.mocked(api.getMovies).mockResolvedValue([...mockMovies]);
      await moviesStore.loadMovies();

      vi.mocked(api.deleteMovie).mockResolvedValue(undefined);

      const ok = await moviesStore.deleteMovie('1');

      expect(api.deleteMovie).toHaveBeenCalledWith('1');
      expect(ok).toBe(true);
      expect(moviesStore.movies.find(m => m.id === '1')).toBeUndefined();
    });
  });

  // ─── toggleFavorite ──────────────────────────────────────────
  describe('toggleFavorite()', () => {
    it('debería marcar película como favorita', async () => {
      vi.mocked(api.getMovies).mockResolvedValue([...mockMovies]);
      await moviesStore.loadMovies();

      const favoriteMovie = { ...mockMovies[0], isFavorite: true };
      vi.mocked(api.toggleFavorite).mockResolvedValue(favoriteMovie);

      const ok = await moviesStore.toggleFavorite('1');

      expect(api.toggleFavorite).toHaveBeenCalledWith('1');
      expect(ok).toBe(true);

      const movie = moviesStore.movies.find(m => m.id === '1');
      expect(movie?.isFavorite).toBe(true);
    });
  });

  // ─── ⭐ rateMovie ─────────────────────────────────────────────
  describe('rateMovie()', () => {
    it('debería actualizar el rating de una película', async () => {
      // ARRANGE
      const moviesWithoutRating: Movie[] = [
        { id: '1', title: 'Inception', director: 'Christopher Nolan', year: 2010 }
      ];

      vi.mocked(api.getMovies).mockResolvedValue(moviesWithoutRating);
      await moviesStore.loadMovies();

      const movie = moviesStore.movies[0];
      const updatedMovie: Movie = { ...movie, rating: 4 };

      vi.mocked(api.rateMovie).mockResolvedValue(updatedMovie);

      // ACT
      const ok = await moviesStore.rateMovie(movie, 4);

      // ASSERT
      expect(api.rateMovie).toHaveBeenCalledWith('1', 4);
      expect(ok).toBe(true);
      expect(moviesStore.movies[0].rating).toBe(4);
    });
  });
});

/**
 * NOTAS PARA ESTUDIANTES (Svelte 5):
 * 
 * 1. Mock de api (no apiService)
 *    - El store importa { api } de './api.service'
 * 
 * 2. moviesStore.reset()
 *    - Limpia estado entre tests
 * 
 * 3. rateMovie sigue patrón de favoritos:
 *    - optimistic update
 *    - llamada API
 *    - rollback en caso de error
 */