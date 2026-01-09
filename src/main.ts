import { mount } from "svelte";

// AIDEV-NOTE: Las fuentes se importan directamente en JS para que Vite las procese
// correctamente y las incluya en el bundle. El @import de CSS no resuelve
// las rutas relativas de node_modules, dejando los archivos .woff sin copiar.
import "material-icons/iconfont/material-icons.css";
import "@fontsource/spline-sans/400.css";
import "@fontsource/spline-sans/500.css";
import "@fontsource/spline-sans/700.css";

// import App from './WebDemo.svelte';
import App from "./MainApp.svelte";
import "./styles/globals.css";

// AIDEV-NOTE: Configurar logger para reducir spam en dev
// Habilitar debug logs con: localStorage.setItem('SYMPHONY_DEBUG', 'true')
import { setGlobalLogger, createConsoleLogger } from "./utils/logger";

const isDebugMode = localStorage.getItem("SYMPHONY_DEBUG") === "true";
setGlobalLogger(
  createConsoleLogger({
    minLevel: isDebugMode ? "debug" : "warn",
  }),
);

// Mount Svelte app
const app = mount(App, {
  target: document.getElementById("root")!,
});

export default app;
