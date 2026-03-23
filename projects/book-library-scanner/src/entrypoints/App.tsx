/**
 * Root application component.
 *
 * Configures client-side routing with react-router-dom. All routes are lazy-
 * loaded so the scanner and detail pages don't block the initial library render.
 *
 * @module entrypoints/App
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { LibraryView } from "./components/LibraryView";
import { ScannerView } from "./components/ScannerView";
import { BookDetailView } from "./components/BookDetailView";

/**
 * Root component defining the application's route tree.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<LibraryView />} />
      <Route path="/scan" element={<ScannerView />} />
      <Route path="/book/:id" element={<BookDetailView />} />
      {/* Catch-all — redirect unknown paths to library */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
