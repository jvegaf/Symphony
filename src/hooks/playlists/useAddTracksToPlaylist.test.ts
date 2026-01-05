/**
 * Tests para useAddTracksToPlaylist y useCreatePlaylistWithTracks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAddTracksToPlaylist, useCreatePlaylistWithTracks } from './useAddTracksToPlaylist';

// Mock de invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAddTracksToPlaylist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería llamar a add_tracks_to_playlist con los parámetros correctos', async () => {
    vi.mocked(invoke).mockResolvedValue(3);

    const { result } = renderHook(() => useAddTracksToPlaylist(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      playlistId: 'playlist-123',
      trackIds: ['track-1', 'track-2', 'track-3'],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith('add_tracks_to_playlist', {
      playlistId: 'playlist-123',
      trackIds: ['track-1', 'track-2', 'track-3'],
    });
    expect(result.current.data).toBe(3);
  });

  it('debería manejar errores correctamente', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('DB Error'));

    const { result } = renderHook(() => useAddTracksToPlaylist(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      playlistId: 'playlist-123',
      trackIds: ['track-1'],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('debería funcionar con lista vacía de tracks', async () => {
    vi.mocked(invoke).mockResolvedValue(0);

    const { result } = renderHook(() => useAddTracksToPlaylist(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      playlistId: 'playlist-123',
      trackIds: [],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });
});

describe('useCreatePlaylistWithTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería llamar a create_playlist_with_tracks con los parámetros correctos', async () => {
    vi.mocked(invoke).mockResolvedValue('new-playlist-id');

    const { result } = renderHook(() => useCreatePlaylistWithTracks(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Mi Playlist',
      description: 'Descripción de prueba',
      trackIds: ['track-1', 'track-2'],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith('create_playlist_with_tracks', {
      name: 'Mi Playlist',
      description: 'Descripción de prueba',
      trackIds: ['track-1', 'track-2'],
    });
    expect(result.current.data).toBe('new-playlist-id');
  });

  it('debería manejar descripción null', async () => {
    vi.mocked(invoke).mockResolvedValue('new-playlist-id');

    const { result } = renderHook(() => useCreatePlaylistWithTracks(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Sin Descripción',
      trackIds: ['track-1'],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith('create_playlist_with_tracks', {
      name: 'Sin Descripción',
      description: null,
      trackIds: ['track-1'],
    });
  });

  it('debería manejar errores correctamente', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Playlist creation failed'));

    const { result } = renderHook(() => useCreatePlaylistWithTracks(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Test',
      trackIds: ['track-1'],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('debería crear playlist con lista vacía de tracks', async () => {
    vi.mocked(invoke).mockResolvedValue('empty-playlist-id');

    const { result } = renderHook(() => useCreatePlaylistWithTracks(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Playlist Vacía',
      trackIds: [],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe('empty-playlist-id');
  });
});
