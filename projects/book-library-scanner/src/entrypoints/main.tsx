/**
 * Application entrypoint — mounts the React app and registers the PWA service worker.
 *
 * @module entrypoints/main
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./index.css";

// Register the PWA service worker for offline support and installability.
// autoUpdateReady fires when a new version is cached — we reload silently.
registerSW({ immediate: true });

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in the document.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
