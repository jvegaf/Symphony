<script lang="ts">
  import { onMount } from 'svelte';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from './lib/query-client';

  // Main application components
  import Sidebar from './lib/components/layout/Sidebar.svelte';
  import TrackTable from './lib/components/layout/TrackTable/index.svelte';
  import PlayerSection from './lib/components/layout/PlayerSection.svelte';
  import SettingsModal from './lib/components/SettingsModal.svelte';
  import OnboardingModal from './lib/components/OnboardingModal.svelte';
  import TrackDetail from './lib/components/TrackDetail.svelte';

  // Types
  import type { Track } from './types/library';

  // Application state
  let currentTrack: Track | null = $state(null);
  let selectedTracks: Track[] = $state([]);
  let selectedPlaylistId: string | null = $state(null);
  let totalTracks = $state(0);
  let searchQuery = $state('');
  let isSettingsOpen = $state(false);
  let isOnboardingOpen = $state(false);
  let isTrackDetailOpen = $state(false);
  let trackDetailId = $state<string | null>(null);
  let pendingTracksForNewPlaylist = $state<{ trackIds: string[] } | null>(null);

  // Mock data for web demonstration
  const mockTracks: Track[] = [
    {
      id: '1',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      duration: 355,
      year: 1975,
      genre: 'Rock',
      bpm: 72,
      key: 'A Minor',
      rating: 5,
      path: '/mock/path/1.mp3',
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      fileSize: 12345678,
      bitrate: 320,
      sampleRate: 44100,
      playCount: 0
    },
    {
      id: '2',
      title: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      album: 'Led Zeppelin IV',
      duration: 482,
      year: 1971,
      genre: 'Rock',
      bpm: 82,
      key: 'A Minor',
      rating: 5,
      path: '/mock/path/2.mp3',
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      fileSize: 15432123,
      bitrate: 320,
      sampleRate: 44100,
      playCount: 0
    },
    {
      id: '3',
      title: 'Hotel California',
      artist: 'Eagles',
      album: 'Hotel California',
      duration: 391,
      year: 1976,
      genre: 'Rock',
      bpm: 75,
      key: 'Am',
      rating: 4,
      path: '/mock/path/3.mp3',
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      fileSize: 14567890,
      bitrate: 320,
      sampleRate: 44100,
      playCount: 0
    },
    {
      id: '4',
      title: 'Dream On',
      artist: 'Aerosmith',
      album: 'Aerosmith',
      duration: 267,
      year: 1973,
      genre: 'Rock',
      bpm: 78,
      key: 'F# Minor',
      rating: 4,
      path: '/mock/path/4.mp3',
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      fileSize: 9876543,
      bitrate: 320,
      sampleRate: 44100,
      playCount: 0
    }
  ];

  onMount(() => {
    console.log('🎵 Symphony Music Library - Web Demo Version');
    console.log('📊 Mock data loaded:', mockTracks.length, 'tracks');
    // Initialize with mock data
    totalTracks = mockTracks.length;
  });

  // Event handlers
  function handleSearchChange(query: string) {
    searchQuery = query;
    console.log('🔍 Search query:', query);
  }

  function handleTracksSelect(tracks: Track[]) {
    selectedTracks = tracks;
    console.log('🎵 Selected tracks:', tracks.length);
  }

  function handleTrackDoubleClick(track: Track, _sortedTracks: Track[], index: number) {
    currentTrack = track;
    console.log('🎶 Playing track:', track.title, 'at index:', index);
  }

  function handleSelectPlaylist(playlistId: string | null) {
    selectedPlaylistId = playlistId;
    console.log('📂 Selected playlist:', playlistId);
  }

  function handleTrackDetails(track: Track) {
    trackDetailId = track.id ?? null;
    isTrackDetailOpen = true;
    console.log('📋 Opening track details:', track.title);
  }

  function handleAddToNewPlaylist(trackIds: string[]) {
    pendingTracksForNewPlaylist = { trackIds };
    console.log('➕ Adding tracks to new playlist:', trackIds);
  }

  function handleCloseTrackDetail() {
    isTrackDetailOpen = false;
    trackDetailId = null;
  }

  function handleOnboardingComplete() {
    isOnboardingOpen = false;
    console.log('✅ Onboarding completed');
  }
</script>

<QueryClientProvider client={queryClient}>
  <div class="h-screen flex bg-gray-100 dark:bg-gray-900">
    <!-- Sidebar -->
    <Sidebar
      {searchQuery}
      onSearchChange={handleSearchChange}
      {totalTracks}
      {pendingTracksForNewPlaylist}
      onPlaylistCreatedWithTracks={() => pendingTracksForNewPlaylist = null}
      {selectedPlaylistId}
      onSelectPlaylist={handleSelectPlaylist}
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            🎵 Symphony <span class="text-sm text-gray-500 dark:text-gray-400">(Web Demo)</span>
          </h1>
          <div class="flex items-center space-x-4">
            <button
              onclick={() => isSettingsOpen = true}
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ⚙️ Settings
            </button>
            <button
              onclick={() => isOnboardingOpen = true}
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              📁 Import Library
            </button>
          </div>
        </div>
      </header>

      <!-- Track Table -->
      <div class="flex-1 overflow-hidden">
        <TrackTable
          tracks={mockTracks}
          {selectedTracks}
          playingTrack={currentTrack}
          onTracksSelect={handleTracksSelect}
          onTrackDoubleClick={handleTrackDoubleClick}
          onTrackDetails={handleTrackDetails}
          onAddToNewPlaylist={handleAddToNewPlaylist}
          isLoading={false}
          {selectedPlaylistId}
        />
      </div>

      <!-- Player Section -->
      <PlayerSection
        track={currentTrack}
        onTrackChange={(track) => currentTrack = track}
      />
    </div>
  </div>

  <!-- Modals -->
  {#if isSettingsOpen}
    <SettingsModal
      isOpen={isSettingsOpen}
      onClose={() => isSettingsOpen = false}
    />
  {/if}

  {#if isOnboardingOpen}
    <OnboardingModal
      onComplete={handleOnboardingComplete}
    />
  {/if}

  {#if isTrackDetailOpen && trackDetailId}
    <TrackDetail
      trackId={trackDetailId}
      tracks={mockTracks}
      onClose={handleCloseTrackDetail}
    />
  {/if}
</QueryClientProvider>