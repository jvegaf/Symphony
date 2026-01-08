<script lang="ts">
  import { onMount } from 'svelte';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from './lib/query-client';
  import Button from './lib/components/ui/Button.svelte';
  
  let count = $state(0);
  let name = $state('Symphony');
  
  // Derived value
  let doubled = $derived(count * 2);
  
  onMount(() => {
    console.log('Symphony Svelte 5 app mounted!');
  });
  
  function increment() {
    count += 1;
  }
  
  function decrement() {
    count -= 1;
  }
</script>

<QueryClientProvider client={queryClient}>
  <main class="h-screen bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900 flex items-center justify-center">
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl border border-white/20 max-w-2xl">
      <h1 class="text-6xl font-bold text-white mb-4 text-center">
        🎵 {name}
      </h1>
      
      <p class="text-xl text-white/80 text-center mb-8">
        Migración a Svelte 5 exitosa!
      </p>
      
      <div class="bg-white/5 rounded-lg p-6 mb-6">
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
      
      <div class="mt-8 text-center">
        <p class="text-white/60 text-sm">
          Svelte 5 + TypeScript + Tauri 2.0 + TanStack Query
        </p>
        <p class="text-white/40 text-xs mt-2">
          Runes: $state, $derived, $effect ✨ | Button component working!
        </p>
      </div>
    </div>
  </main>
</QueryClientProvider>
