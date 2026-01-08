<script lang="ts">
  import Card from '../ui/Card.svelte';
  import Button from '../ui/Button.svelte';
  import type { Playlist } from '@/types/playlist';

  interface Props {
    /** Datos de la playlist */
    playlist: Playlist;
    /** Número de pistas en la playlist */
    trackCount?: number;
    /** Callback al abrir playlist */
    onOpen: (playlist: Playlist) => void;
    /** Callback al eliminar playlist */
    onDelete: (id: string) => void;
  }

  /**
   * Tarjeta que muestra información de una playlist
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - React.FC<Props> → let { ...props } = $props()
   * - {playlist.description && ...} → {#if playlist.description}
   * - onClick={() => ...} → onclick={() => ...}
   * - className → class
   * 
   * @example
   * <PlaylistCard 
   *   playlist={myPlaylist}
   *   trackCount={42}
   *   onOpen={handleOpen}
   *   onDelete={handleDelete}
   * />
   */
  let { 
    playlist,
    trackCount = 0,
    onOpen,
    onDelete,
  }: Props = $props();
</script>

<Card class="p-4">
  <h3 class="text-lg font-semibold mb-2">{playlist.name}</h3>
  
  {#if playlist.description}
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
      {playlist.description}
    </p>
  {/if}
  
  <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">
    {trackCount} pistas
  </p>
  
  <div class="flex items-center justify-between">
    <Button variant="secondary" onclick={() => onOpen(playlist)}>
      Abrir
    </Button>
    <Button
      variant="primary"
      onclick={() => onDelete(playlist.id)}
      class="bg-red-600 hover:bg-red-700"
    >
      Eliminar
    </Button>
  </div>
</Card>
