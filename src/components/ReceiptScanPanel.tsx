import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from './ui/button';
import {
  AlertCircle,
  Camera,
  ImagePlus,
  Loader2,
  ScanLine,
  X,
} from 'lucide-react';
import { parseReceiptText } from '../utils/receiptParser';

export interface ReceiptScanResult {
  description: string;
  amount: string;
  notes: string;
  itemCount: number;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

interface ReceiptScanPanelProps {
  onScanComplete: (result: ReceiptScanResult) => void;
}

type ScanPhase = 'idle' | 'loading' | 'error';

function clearInput(el: HTMLInputElement | null) {
  if (el) el.value = '';
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

async function preprocessImageForOcr(file: File): Promise<Blob | File> {
  try {
    const bitmap = await createImageBitmap(file);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = longestSide < 2200 ? Math.min(3, 2200 / longestSide) : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.filter = 'grayscale(1) contrast(1.9) brightness(1.08)';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const value = data[i];
      const cleaned = value < 185 ? Math.max(0, value - 25) : Math.min(255, value + 18);
      data[i] = cleaned;
      data[i + 1] = cleaned;
      data[i + 2] = cleaned;
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await canvasToBlob(canvas);
    return blob || file;
  } catch {
    return file;
  }
}

export function ReceiptScanPanel({ onScanComplete }: ReceiptScanPanelProps) {
  const galleryInputId = useId();
  const cameraInputId = useId();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progressLabel, setProgressLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [webcamStarting, setWebcamStarting] = useState(false);

  const hasWebApi =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  /** Live `getUserMedia` works in secure contexts; localhost is treated as OK for dev. */
  const canUseWebcam =
    hasWebApi &&
    typeof window !== 'undefined' &&
    (window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  /**
   * Fallback when webcam API is unavailable (e.g. opened as file:// or http://LAN_IP).
   * Opens the OS picker; on many phones `capture` still opens the Camera app.
   */
  const openNativeCaptureFallback = () => {
    cameraRef.current?.click();
  };

  const stopWebcamStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const runScan = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      setPhase('loading');
      setProgressLabel('Loading OCR…');

      try {
        const { createWorker, PSM } = await import('tesseract.js');
        const worker = await createWorker('eng', undefined, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const p = typeof m.progress === 'number' ? Math.round(m.progress * 100) : 0;
              setProgressLabel(`Reading text… ${p}%`);
            } else if (m.status === 'loading tesseract core') {
              setProgressLabel('Starting OCR engine…');
            } else if (m.status === 'initializing api') {
              setProgressLabel('Initializing…');
            } else if (m.status === 'loading language traineddata') {
              setProgressLabel('Loading language data…');
            }
          },
        });
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
          preserve_interword_spaces: '1',
          user_defined_dpi: '300',
        });

        setProgressLabel('Preparing image…');
        const ocrImage = await preprocessImageForOcr(file);

        setProgressLabel('Reading receipt…');
        const {
          data: { text },
        } = await worker.recognize(ocrImage);
        await worker.terminate();

        const parsed = parseReceiptText(text);
        const amountStr =
          parsed.amount !== null ? parsed.amount.toFixed(2) : '';

        onScanComplete({
          description: parsed.description,
          amount: amountStr,
          notes: parsed.notes,
          itemCount: parsed.itemCount,
          confidence: parsed.confidence,
          warnings: parsed.warnings,
        });

        setPhase('idle');
        setProgressLabel('');
        clearInput(galleryRef.current);
        clearInput(cameraRef.current);
      } catch (e) {
        console.error(e);
        setPhase('error');
        setErrorMessage(
          e instanceof Error ? e.message : 'Something went wrong while scanning.',
        );
        setProgressLabel('');
      }
    },
    [onScanComplete],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setPhase('error');
      setErrorMessage('Please choose an image file (PNG, JPG, or screenshot).');
      return;
    }
    void runScan(file);
  };

  const dismissError = () => {
    setPhase('idle');
    setErrorMessage(null);
    clearInput(galleryRef.current);
    clearInput(cameraRef.current);
  };

  useEffect(() => {
    if (!webcamOpen || !hasWebApi) {
      stopWebcamStream();
      setWebcamStarting(false);
      return;
    }

    let cancelled = false;
    setWebcamStarting(true);

    (async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(
            'Could not use the camera. Allow access when your browser asks, or use Choose photo to pick an image from your computer.',
          );
          setPhase('error');
          setWebcamOpen(false);
        }
      } finally {
        if (!cancelled) setWebcamStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      stopWebcamStream();
    };
  }, [webcamOpen, hasWebApi, stopWebcamStream]);

  const captureWebcamFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    // Upscale the captured frame to improve OCR accuracy.
    const scale = 2;
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Simple preprocessing: contrast + grayscale to help Tesseract.
    // (Supported in modern browsers for drawImage.)
    ctx.filter = 'grayscale(1) contrast(1.6) brightness(1.05)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopWebcamStream();
        setWebcamOpen(false);
        const file = new File([blob], 'receipt-webcam.jpg', {
          type: blob.type || 'image/png',
        });
        void runScan(file);
      },
      'image/png',
    );
  };

  const closeWebcam = () => {
    stopWebcamStream();
    setWebcamOpen(false);
  };

  /** Prefer browser webcam — works on computers; avoids DevTools “mobile” UA + broken desktop capture. */
  const openLiveCamera = () => {
    if (busy) return;
    setErrorMessage(null);
    if (canUseWebcam) {
      setWebcamOpen(true);
      return;
    }
    setPhase('error');
    setErrorMessage(
      'Live camera needs this page served over https, http://localhost, or http://127.0.0.1 (opening index.html as a file will not work). Run npm run dev and use Choose photo if needed.',
    );
  };

  const busy = phase === 'loading';

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <ScanLine className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-slate-800">
            Scan a receipt or screenshot
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pick a saved image, or use <strong className="text-slate-700">Live camera</strong>{' '}
            for your webcam (allow permission when asked). Everything stays on your
            device—verify amount, item details, and description before saving.
          </p>
        </div>
      </div>

      {/* Gallery: existing photos & files (no capture hint) */}
      <input
        ref={galleryRef}
        id={galleryInputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={onFileChange}
      />

      {/* Camera app: phones/tablets open the built-in camera to take a new picture */}
      <input
        ref={cameraRef}
        id={cameraInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={busy}
        onChange={onFileChange}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            disabled={busy}
            onClick={() => galleryRef.current?.click()}
            className="bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-medium px-4 py-2 shadow-sm justify-center sm:justify-start"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" aria-hidden />
                Scanning…
              </>
            ) : (
              <>
                <ImagePlus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                Choose photo
              </>
            )}
          </Button>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">
            Camera
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              disabled={busy}
              onClick={openLiveCamera}
              className="bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 font-semibold px-4 py-2.5 shadow-sm justify-center sm:justify-start"
            >
              <Camera className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              Live camera
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setErrorMessage(null);
                openNativeCaptureFallback();
              }}
              className="bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100/80 font-medium px-4 py-2 shadow-sm justify-center sm:justify-start text-sm"
            >
              Use device camera / gallery
            </Button>
          </div>
          <p className="text-[11px] text-emerald-900/80 leading-snug">
            <strong>Live camera</strong> opens a preview in this page (best on laptop/desktop).
            On phones you can use <strong>Use device camera / gallery</strong> if you prefer
            your normal Camera app—on many computers that option only picks files.
          </p>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-snug">
        If <strong className="text-slate-600">Live camera</strong> does nothing or errors, run
        the app with <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">npm run dev</code>{' '}
        and open <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">localhost</code>{' '}
        (not a saved HTML file).
      </p>

      {busy && (
        <span className="text-xs text-slate-500 block" aria-live="polite">
          {progressLabel || 'Working…'}
        </span>
      )}

      {phase === 'error' && errorMessage && (
        <div
          className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={dismissError}
              className="mt-1 text-xs font-medium text-rose-800 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {webcamOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={galleryInputId + '-webcam-title'}
        >
          <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 p-4 shadow-xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p id={galleryInputId + '-webcam-title'} className="font-semibold text-slate-800">
                Point at your receipt
              </p>
              <button
                type="button"
                onClick={closeWebcam}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close webcam"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-900">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
              />
              {webcamStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm">
                  Starting camera…
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              <Button
                type="button"
                onClick={closeWebcam}
                className="bg-white border border-slate-300 text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={webcamStarting}
                onClick={captureWebcamFrame}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Capture & scan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
