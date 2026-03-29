import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface UseScannerOptions {
  onDetected: (isbn: string) => void;
}

export function useScanner({ onDetected }: UseScannerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);

    if (!videoRef.current) return;

    try {
      // Step 1: Explicitly request camera to trigger iOS permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;

      // Attach stream to video element so iOS shows the camera feed
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setIsScanning(true);

      // Step 2: Use @zxing to decode from the already-active stream
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      reader.decodeFromStream(stream, videoRef.current, (result, err) => {
        if (result) {
          const text = result.getText();
          if (/^97[89]\d{10}$/.test(text)) {
            stop();
            onDetected(text);
          }
        }
        if (err && !(err instanceof NotFoundException)) {
          // Ignore non-detection errors
        }
      });
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Accès caméra refusé. Allez dans Réglages > Safari > Caméra pour autoriser ce site."
          : "Impossible d'accéder à la caméra. Vérifiez les permissions.";
      setError(msg);
      setIsScanning(false);
    }
  }, [onDetected]);

  const stop = useCallback(() => {
    readerRef.current?.reset();
    readerRef.current = null;
    // Stop all camera tracks
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      readerRef.current?.reset();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { videoRef, isScanning, error, start, stop };
}
