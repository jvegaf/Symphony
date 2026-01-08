import { defineConfig, type UserConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async (): Promise<UserConfig> => ({
  plugins: [
    svelte(),
    tailwindcss(),
  ],

  // Optimizaciones para desarrollo más rápido
  optimizeDeps: {
    // Pre-bundle dependencias pesadas para evitar re-bundling
    include: [
      "svelte",
      "@tanstack/svelte-query",
      "lucide-svelte",
      "wavesurfer.js",
      "svelte-dnd-action",
      "clsx",
    ],
    // Excluir módulos nativos de Tauri
    exclude: ["@tauri-apps/api", "@tauri-apps/plugin-dialog", "@tauri-apps/plugin-fs"],
  },

  // Resolver aliases para imports más rápidos
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Configuración de build
  build: {
    // Reducir el tamaño de chunks para mejor caching
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Separar vendor chunks para mejor caching
        manualChunks: {
          vendor: ["svelte"],
          query: ["@tanstack/svelte-query"],
          ui: ["lucide-svelte", "clsx"],
          audio: ["wavesurfer.js"],
        },
      },
    },
  },

  // Vite options tailored for Tauri development
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : {
          // HMR optimizado para desarrollo local
          overlay: true,
        },
    watch: {
      // Ignorar más archivos para reducir polling
      ignored: [
        "**/src-tauri/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**",
        "**/coverage/**",
        "**/test-results/**",
        "**/e2e-report/**",
      ],
      // Usar polling solo si es necesario (WSL, Docker)
      usePolling: false,
    },
    // Warming cache de módulos
    warmup: {
      clientFiles: [
        "./src/App.svelte",
        "./src/main.ts",
        "./src/components/**/*.svelte",
        "./src/lib/**/*.ts",
      ],
    },
  },

  // Reducir sourcemaps en desarrollo para mejor rendimiento
  css: {
    devSourcemap: false,
  },

  // Configuración de esbuild para desarrollo más rápido
  esbuild: {
    // Eliminar console.log en producción
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
}));
