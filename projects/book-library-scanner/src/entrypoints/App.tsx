/**
 * Root application component.
 *
 * Configures client-side routing with react-router-dom.
 *
 * Routes:
 *   /                  — Library view (main)
 *   /scan              — Barcode scanner
 *   /add               — Manual book add (ISBN lookup or full form)
 *   /book/:id          — Book detail / edit
 *   /stats             — Reading statistics dashboard
 *   /recommendations   — Personalised book recommendations
 *
 * @module entrypoints/App
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { LibraryView } from "./components/LibraryView";
import { ScannerView } from "./components/ScannerView";
import { BookDetailView } from "./components/BookDetailView";
import { StatsView } from "./components/StatsView";
import { ManualAddView } from "./components/ManualAddView";
import { RecommendationsView } from "./components/RecommendationsView";

/**
 * Root component defining the application's route tree.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<LibraryView />} />
      <Route path="/scan" element={<ScannerView />} />
      <Route path="/add" element={<ManualAddView />} />
      <Route path="/book/:id" element={<BookDetailView />} />
      <Route path="/stats" element={<StatsView />} />
      <Route path="/recommendations" element={<RecommendationsView />} />
      {/* Catch-all — redirect unknown paths to library */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
