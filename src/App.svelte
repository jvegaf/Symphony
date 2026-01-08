<script lang="ts">
  import { onMount } from 'svelte';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from './lib/query-client';
  import Button from './lib/components/ui/Button.svelte';
  import Card from './lib/components/ui/Card.svelte';
  import Input from './lib/components/ui/Input.svelte';
  import StarRating from './lib/components/ui/StarRating.svelte';
  import ConfirmDialog from './lib/components/ui/ConfirmDialog.svelte';
  import PlaylistCard from './lib/components/playlist/PlaylistCard.svelte';
  import EmptyState from './lib/components/layout/TrackTable/components/EmptyState.svelte';
  import LoadingState from './lib/components/layout/TrackTable/components/LoadingState.svelte';
  import type { Playlist } from './types/playlist';
  
  let count = $state(0);
  let name = $state('Symphony');
  let inputValue = $state('');
  let rating = $state(3);
  let showDialog = $state(false);
  let showLoading = $state(false);
  let showEmpty = $state(false);
  
  // Derived value
  let doubled = $derived(count * 2);
  
  // Mock playlist
  const mockPlaylist: Playlist = {
    id: '1',
    name: 'Mi Playlist Favorita',
    description: 'Una colección de mis mejores tracks',
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
  };
  
  onMount(() => {
    console.log('Symphony Svelte 5 app mounted!');
  });
  
  function increment() {
    count += 1;
  }
  
  function decrement() {
    count -= 1;
  }
  
  function handleRatingChange(newRating: number) {
    rating = newRating;
  }
  
  function handleConfirm() {
    console.log('Confirmed!');
    showDialog = false;
  }
  
  function handlePlaylistOpen(playlist: Playlist) {
    console.log('Opening playlist:', playlist.name);
  }
  
  function handlePlaylistDelete(id: string) {
    console.log('Deleting playlist:', id);
    showDialog = true;
  }
</script>

<QueryClientProvider client={queryClient}>
  <main class="h-screen bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900 p-8 overflow-auto">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-5xl font-bold text-white mb-2">
          🎵 {name}
        </h1>
        <p class="text-xl text-white/80">
          Migración a Svelte 5 - Phase 2 Component Showcase
        </p>
      </div>

      <!-- Button Component Demo -->
      <Card title="Button Component" class="bg-white/10 backdrop-blur-lg border-white/20">
        <div class="space-y-4">
          <div class="bg-white/5 rounded-lg p-4">
            <p class="text-white text-lg mb-2">
              Contador: <span class="font-mono font-bold text-purple-300">{count}</span>
            </p>
            <p class="text-white/70 text-sm">
              Doble: <span class="font-mono">{doubled}</span>
            </p>
          </div>
          
          <div class="flex gap-3">
            <Button variant="secondary" onclick={decrement} class="flex-1">
              Decrementar
            </Button>
            
            <Button variant="primary" onclick={increment} class="flex-1">
              Incrementar
            </Button>
          </div>
        </div>
      </Card>

      <!-- Input Component Demo -->
      <Card title="Input Component" class="bg-white/10 backdrop-blur-lg border-white/20">
        <div class="space-y-4">
          <Input 
            label="Tu nombre" 
            placeholder="Escribe algo..." 
            bind:value={inputValue}
            class="text-white"
          />
          
          {#if inputValue}
            <p class="text-white/80 text-sm">
              Has escrito: <span class="font-mono text-purple-300">{inputValue}</span>
            </p>
          {/if}
          
          <Input 
            label="Email" 
            type="email"
            placeholder="usuario@ejemplo.com"
            error="Este campo es requerido"
          />
        </div>
      </Card>

      <!-- StarRating Component Demo -->
      <Card title="StarRating Component" class="bg-white/10 backdrop-blur-lg border-white/20">
        <div class="space-y-4">
          <div>
            <p class="text-white text-sm mb-3">Rating actual: {rating}/5</p>
            <StarRating 
              value={rating} 
              onchange={handleRatingChange}
              size="lg"
            />
          </div>
          
          <div>
            <p class="text-white text-sm mb-3">Tamaño medio (Read-only)</p>
            <StarRating value={4} readOnly size="md" />
          </div>
          
          <div>
            <p class="text-white text-sm mb-3">Tamaño pequeño</p>
            <StarRating value={2} onchange={handleRatingChange} size="sm" />
          </div>
        </div>
      </Card>

      <!-- Component Status -->
      <Card title="Component Migration Status" class="bg-white/10 backdrop-blur-lg border-white/20">
        <div class="space-y-2 text-white/80 text-sm">
          <p>✅ <span class="text-green-400">Button</span> - Migrado y funcionando</p>
          <p>✅ <span class="text-green-400">Card</span> - Migrado y funcionando</p>
          <p>✅ <span class="text-green-400">Input</span> - Migrado y funcionando</p>
          <p>✅ <span class="text-green-400">StarRating</span> - Migrado y funcionando</p>
          <p>✅ <span class="text-green-400">ConfirmDialog</span> - Migrado</p>
          <p>✅ <span class="text-green-400">PlaylistCard</span> - Migrado</p>
          <p>✅ <span class="text-green-400">EmptyState</span> - Migrado</p>
          <p>✅ <span class="text-green-400">LoadingState</span> - Migrado</p>
          <p class="pt-4 text-white/60 text-xs">
            Phase 2 Progress: 8/11 simple components complete (73%)
          </p>
        </div>
      </Card>

      <!-- PlaylistCard Demo -->
      <Card title="PlaylistCard Component" class="bg-white/10 backdrop-blur-lg border-white/20">
        <PlaylistCard 
          playlist={mockPlaylist}
          trackCount={42}
          onOpen={handlePlaylistOpen}
          onDelete={handlePlaylistDelete}
        />
      </Card>

      <!-- States Demo -->
      <Card title="States Components" class="bg-white/10 backdrop-blur-lg border-white/20">
        <div class="space-y-6">
          <!-- Empty State Toggle -->
          <div>
            <Button 
              variant={showEmpty ? "primary" : "secondary"}
              onclick={() => showEmpty = !showEmpty}
            >
              {showEmpty ? 'Hide' : 'Show'} Empty State
            </Button>
            {#if showEmpty}
              <div class="mt-4">
                <EmptyState />
              </div>
            {/if}
          </div>

          <!-- Loading State Toggle -->
          <div>
            <Button 
              variant={showLoading ? "primary" : "secondary"}
              onclick={() => showLoading = !showLoading}
            >
              {showLoading ? 'Hide' : 'Show'} Loading State
            </Button>
            {#if showLoading}
              <div class="mt-4">
                <LoadingState />
              </div>
            {/if}
          </div>

          <!-- Confirm Dialog Trigger -->
          <div>
            <Button 
              variant="primary"
              onclick={() => showDialog = true}
              class="bg-red-600 hover:bg-red-700"
            >
              Show Confirm Dialog
            </Button>
          </div>
        </div>
      </Card>

      <!-- Confirm Dialog -->
      <ConfirmDialog
        isOpen={showDialog}
        title="¿Eliminar playlist?"
        message="Esta acción no se puede deshacer. ¿Estás seguro?"
        onConfirm={handleConfirm}
        onCancel={() => showDialog = false}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />

      <!-- Footer -->
      <div class="text-center text-white/40 text-xs mt-8">
        <p>Svelte 5 + TypeScript + Tauri 2.0 + TanStack Query</p>
        <p class="mt-1">Runes: $state, $derived, $effect ✨</p>
      </div>
    </div>
  </main>
</QueryClientProvider>
