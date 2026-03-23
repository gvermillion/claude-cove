/**
 * React hook for camera-based barcode scanning via @zxing/browser.
 *
 * Manages the camera lifecycle (start/stop), decodes barcodes from the video
 * stream, and exposes scan results and error state to the UI.
 *
 * @module entrypoints/hooks/useBarcodeScanner
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export interface BarcodeScannerState {
  /** The last successfully decoded barcode value, or null. */
  lastScanned: string | null;

  /** Whether the camera is currently active. */
  isScanning: boolean;

  /** Error message if camera permission denied or device not supported. */
  error: string | null;

  /** Start the camera and begin scanning. */
  startScanning: (videoRef: React.RefObject<HTMLVideoElement>) => Promise<void>;

  /** Stop the camera and release resources. */
  stopScanning: () => void;

  /** Clear the last scanned value to allow re-scanning the same barcode. */
  resetScan: () => void;
}

/**
 * Custom hook providing barcode scanning via the device camera.
 *
 * Configures @zxing/browser to prioritize 1D barcode formats (EAN-13, EAN-8,
 * UPC-A) used on book spines. The rear-facing camera is preferred on mobile.
 *
 * @returns BarcodeScannerState — camera controls and scan result state.
 */
export function useBarcodeScanner(): BarcodeScannerState {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // Initialize the reader with hints that prioritize book barcodes
  const getReader = useCallback((): BrowserMultiFormatReader => {
    if (!readerRef.current) {
      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      readerRef.current = new BrowserMultiFormatReader(hints);
    }
    return readerRef.current;
  }, []);

  const stopScanning = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }, []);

  const startScanning = useCallback(
    async (videoRef: React.RefObject<HTMLVideoElement>): Promise<void> => {
      if (!videoRef.current) return;

      setError(null);
      setIsScanning(true);

      try {
        const reader = getReader();

        // Prefer the rear camera on mobile devices
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const rearCamera =
          devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment"),
          ) ?? devices[0];

        const deviceId = rearCamera?.deviceId;

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, _err, controls) => {
            if (result) {
              const text = result.getText();
              setLastScanned(text);
              // Pause scanning briefly after a successful read to prevent
              // flooding the UI with duplicate scans of the same barcode.
              controls.stop();
              setIsScanning(false);
            }
          },
        );

        controlsRef.current = controls;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Camera access failed";

        if (message.toLowerCase().includes("permission")) {
          setError(
            "Camera permission denied. Please allow camera access in your browser settings.",
          );
        } else if (message.toLowerCase().includes("overconstrained")) {
          setError("No suitable camera found. Try using your device's rear camera.");
        } else {
          setError(`Camera error: ${message}`);
        }

        setIsScanning(false);
      }
    },
    [getReader],
  );

  const resetScan = useCallback(() => {
    setLastScanned(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  return { lastScanned, isScanning, error, startScanning, stopScanning, resetScan };
}
