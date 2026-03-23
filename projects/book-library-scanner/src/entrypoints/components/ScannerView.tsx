/**
 * ScannerView — full-screen camera barcode scanning UI.
 *
 * Renders a live camera preview with a targeting overlay, detects ISBN
 * barcodes, fetches book metadata, and adds the book to the library.
 *
 * Batch mode: when enabled, after each successful scan the camera resets
 * immediately and continues scanning — no navigation away between books.
 * A running tally of added books is shown.
 *
 * @module entrypoints/components/ScannerView
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { scanAndAddBook, type ScanOutcome } from "@/application/libraryService";

/** Visual feedback states for the scan-and-lookup flow. */
type FlowState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "fetching"; isbn: string }
  | { phase: "success"; outcome: ScanOutcome & { status: "added" | "duplicate" } }
  | { phase: "error"; message: string };

/**
 * Full-screen scanner page. Activates the camera, decodes barcodes, fetches
 * book metadata via the library service, and navigates to the result on success
 * (or resets immediately in batch mode).
 */
export function ScannerView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const videoRef = useRef<HTMLVideoElement>(null);
  const { lastScanned, isScanning, error: cameraError, startScanning, stopScanning, resetScan } =
    useBarcodeScanner();

  const [flow, setFlow] = useState<FlowState>({ phase: "idle" });
  const [batchMode, setBatchMode] = useState(false);
  // ?wishlist=1 adds scanned books to the wishlist
  const asWishlist = searchParams.get("wishlist") === "1";
  const [batchCount, setBatchCount] = useState(0);
  const isProcessingRef = useRef(false);

  /** Start the camera when the view mounts. */
  useEffect(() => {
    void startScanning(videoRef);
    return () => stopScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** React to a new barcode scan. */
  useEffect(() => {
    if (!lastScanned || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setFlow({ phase: "fetching", isbn: lastScanned });

    const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined;

    void (async () => {
      const outcome = await scanAndAddBook(
        lastScanned,
        { googleBooksApiKey: apiKey || undefined },
        asWishlist,
      );

      if (outcome.status === "added" || outcome.status === "duplicate") {
        setFlow({ phase: "success", outcome });

        if (batchMode) {
          // In batch mode: briefly show confirmation, then reset and continue scanning
          if (outcome.status === "added") setBatchCount((c) => c + 1);
          setTimeout(() => {
            setFlow({ phase: "scanning" });
            resetScan();
            isProcessingRef.current = false;
            void startScanning(videoRef);
          }, 1500);
        } else {
          // Normal mode: navigate to book detail
          setTimeout(() => {
            navigate(`/book/${outcome.entry.id ?? ""}`);
          }, 1200);
        }
      } else {
        setFlow({ phase: "error", message: outcome.error });
        isProcessingRef.current = false;
      }
    })();
  }, [lastScanned, navigate, batchMode, asWishlist, resetScan, startScanning]);

  const handleRetry = useCallback(() => {
    setFlow({ phase: "scanning" });
    resetScan();
    isProcessingRef.current = false;
    void startScanning(videoRef);
  }, [resetScan, startScanning]);

  const handleManualIsbn = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const input = form.elements.namedItem("isbn") as HTMLInputElement;
      const isbn = input.value.trim();
      if (!isbn) return;

      isProcessingRef.current = false;
      resetScan();
      setFlow({ phase: "fetching", isbn });

      const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined;
      void (async () => {
        isProcessingRef.current = true;
        const outcome = await scanAndAddBook(
          isbn,
          { googleBooksApiKey: apiKey || undefined },
          asWishlist,
        );

        if (outcome.status === "added" || outcome.status === "duplicate") {
          setFlow({ phase: "success", outcome });
          if (batchMode) {
            if (outcome.status === "added") setBatchCount((c) => c + 1);
            setTimeout(() => {
              setFlow({ phase: "scanning" });
              resetScan();
              isProcessingRef.current = false;
              void startScanning(videoRef);
              form.reset();
            }, 1500);
          } else {
            setTimeout(() => navigate(`/book/${outcome.entry.id ?? ""}`), 1200);
          }
        } else {
          setFlow({ phase: "error", message: outcome.error });
          isProcessingRef.current = false;
        }
      })();
    },
    [navigate, resetScan, batchMode, asWishlist, startScanning],
  );

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Camera preview */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        aria-label="Camera preview for barcode scanning"
      />

      {/* Targeting overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-black/40" />

        {/* Scan window */}
        <div className="relative z-10 w-72 h-24 rounded-2xl border-2 border-white/80 shadow-lg">
          {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos) => (
            <div
              key={pos}
              className={`absolute ${pos} w-5 h-5 border-white border-2 rounded-sm`}
            />
          ))}
          <div className="absolute inset-x-0 h-0.5 bg-red-400/80 animate-bounce top-1/2" />
        </div>

        <p className="relative z-10 mt-4 text-white/90 text-sm font-medium drop-shadow">
          {isScanning ? "Aim at a book's barcode" : ""}
        </p>
      </div>

      {/* Batch mode banner */}
      {batchMode && (
        <div className="absolute top-safe inset-x-4 mt-3 z-20 flex items-center justify-between bg-black/70 backdrop-blur rounded-2xl px-4 py-2">
          <span className="text-white text-sm font-medium">
            Batch mode · {batchCount} added
          </span>
          <button
            onClick={() => {
              setBatchMode(false);
              setBatchCount(0);
            }}
            className="text-slate-400 text-xs hover:text-white transition"
          >
            Exit
          </button>
        </div>
      )}

      {/* Camera error state */}
      {cameraError && (
        <div className="absolute inset-x-4 top-20 bg-red-900/90 text-red-100 rounded-2xl p-4 text-sm text-center backdrop-blur">
          {cameraError}
        </div>
      )}

      {/* Fetching state */}
      {flow.phase === "fetching" && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white font-medium">Looking up ISBN {flow.isbn}…</p>
        </div>
      )}

      {/* Success state */}
      {flow.phase === "success" && (
        <div className="absolute inset-0 bg-emerald-900/80 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
          <span className="text-6xl">✅</span>
          <p className="text-white font-semibold text-lg">
            {flow.outcome.status === "duplicate" ? "Already in library!" : "Book added!"}
          </p>
          <p className="text-emerald-200 text-sm">{flow.outcome.entry.title}</p>
          {batchMode && (
            <p className="text-emerald-300 text-xs mt-1">Scanning next book…</p>
          )}
        </div>
      )}

      {/* Error state */}
      {flow.phase === "error" && (
        <div className="absolute inset-x-4 bottom-44 bg-slate-800/95 rounded-2xl p-5 flex flex-col gap-3 backdrop-blur shadow-xl">
          <p className="text-red-400 font-semibold text-center">Book not found</p>
          <p className="text-slate-300 text-sm text-center">{flow.message}</p>
          <button
            onClick={handleRetry}
            className="w-full py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition"
          >
            Scan again
          </button>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 pb-safe p-4 flex flex-col gap-3">
        {/* Batch mode toggle */}
        <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur rounded-xl px-4 py-2.5">
          <span className="text-slate-300 text-sm">Batch scan</span>
          <button
            role="switch"
            aria-checked={batchMode}
            onClick={() => {
              setBatchMode((v) => !v);
              setBatchCount(0);
            }}
            className="relative w-10 h-6 rounded-full transition-colors"
            style={{ backgroundColor: batchMode ? "var(--color-accent)" : "rgba(255,255,255,0.15)" }}
          >
            <span
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
              style={{ left: batchMode ? "calc(100% - 1.25rem)" : "0.25rem" }}
            />
          </button>
        </div>

        {/* Manual ISBN entry */}
        <form onSubmit={handleManualIsbn} className="flex gap-2">
          <input
            name="isbn"
            type="text"
            inputMode="numeric"
            pattern="[0-9\-]{10,17}"
            placeholder="Enter ISBN manually…"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/90 text-white placeholder-slate-400 text-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium backdrop-blur hover:bg-white/20 transition"
          >
            Add
          </button>
        </form>

        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="w-full py-3 rounded-xl bg-slate-800/80 text-slate-300 font-medium text-sm backdrop-blur hover:bg-slate-700/80 transition"
        >
          ← Back to Library
        </button>
      </div>
    </div>
  );
}
