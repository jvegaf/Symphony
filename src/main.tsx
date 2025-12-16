import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import "./styles/globals.css";

// AIDEV-NOTE: StrictMode disabled temporarily to debug waveform event listeners
// Double-mounting in dev was causing race conditions with Tauri event emission
// Re-enable after confirming fix works in production mode

// Crear cliente de TanStack Query en la raíz para toda la app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
