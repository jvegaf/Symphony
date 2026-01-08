/**
 * TanStack Query client configuration for Symphony
 * 
 * Este archivo configura el QueryClient para Svelte con las mismas opciones
 * que usábamos en React. El QueryClient es framework-agnostic.
 * 
 * @module lib/query-client
 */
import { QueryClient } from '@tanstack/svelte-query';

/**
 * Cliente de TanStack Query para toda la aplicación
 * 
 * Configuración:
 * - refetchOnWindowFocus: false - No refetch al cambiar de ventana
 * - retry: 1 - Solo un intento de reintento en caso de error
 * - staleTime: 5min - Los datos se consideran frescos durante 5 minutos
 * 
 * AIDEV-NOTE: Este cliente es el mismo que usábamos en React.
 * La única diferencia es que ahora lo exportamos como singleton
 * en lugar de usar un Provider (Svelte no necesita Context Provider).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      // Reducir stale time para menos re-fetches innecesarios
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});
