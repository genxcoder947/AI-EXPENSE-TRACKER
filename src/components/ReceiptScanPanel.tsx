import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  AlertCircle,
  Camera,
  ImagePlus,
  Loader2,
  ScanLine,
  X,
  Check,
  Edit,
} from 'lucide-react';
import { parseReceiptText, TaxInfo } from '../utils/receiptParser';
import { getCurrencySymbol } from '../utils/helpers';

export interface ReceiptScanResult {
  description: string;
  amount: string;
  notes: string;
  itemCount: number;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  taxInfo: TaxInfo;
}

interface ReceiptScanPanelProps {
  onScanComplete: (result: ReceiptScanResult) => void;
  currency: string;
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
    const scale = longestSide < 3000 ? Math.min(4, 3000 / longestSide) : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Step 1: Initial enhancement with advanced filters
    ctx.filter = 'grayscale(1) contrast(3.0) brightness(1.2) saturate(1.5)';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    bitmap.close();

    // Step 2: Get image data for advanced pixel processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Step 3: Advanced adaptive thresholding with local window
    const windowSize = 15;
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const value = data[idx];
        
        // Calculate local threshold using surrounding pixels
        let localSum = 0;
        let localCount = 0;
        
        for (let wy = -halfWindow; wy <= halfWindow; wy++) {
          for (let wx = -halfWindow; wx <= halfWindow; wx++) {
            const ny = y + wy;
            const nx = x + wx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const nIdx = (ny * width + nx) * 4;
              localSum += data[nIdx];
              localCount++;
            }
          }
        }
        
        const localMean = localSum / localCount;
        const threshold = localMean * 0.85;
        
        // Apply adaptive thresholding
        const binarized = value < threshold ? Math.max(0, value - 70) : Math.min(255, value + 50);
        
        data[idx] = binarized;
        data[idx + 1] = binarized;
        data[idx + 2] = binarized;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);

    // Step 4: Apply morphological operations for noise reduction
    // Dilate to connect text regions
    const dilatedData = ctx.getImageData(0, 0, width, height);
    const dilatedPixels = dilatedData.data;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        let maxVal = 0;
        
        // 3x3 dilation kernel
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            maxVal = Math.max(maxVal, data[nIdx]);
          }
        }
        
        dilatedPixels[idx] = maxVal;
        dilatedPixels[idx + 1] = maxVal;
        dilatedPixels[idx + 2] = maxVal;
      }
    }
    
    ctx.putImageData(dilatedData, 0, 0);

    // Step 5: Erosion to remove small noise
    const erodedData = ctx.getImageData(0, 0, width, height);
    const erodedPixels = erodedData.data;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        let minVal = 255;
        
        // 3x3 erosion kernel
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            minVal = Math.min(minVal, dilatedPixels[nIdx]);
          }
        }
        
        erodedPixels[idx] = minVal;
        erodedPixels[idx + 1] = minVal;
        erodedPixels[idx + 2] = minVal;
      }
    }
    
    ctx.putImageData(erodedData, 0, 0);

    // Step 6: Sharpening for text edge enhancement
    ctx.filter = 'contrast(1.3) brightness(1.08) saturate(1.2)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    // Step 7: Final aggressive binarization for OCR
    const finalImageData = ctx.getImageData(0, 0, width, height);
    const finalData = finalImageData.data;
    
    for (let i = 0; i < finalData.length; i += 4) {
      const value = finalData[i];
      // Strong binarization with slight bias toward black
      const binarized = value < 135 ? Math.max(0, value - 80) : Math.min(255, value + 50);
      finalData[i] = binarized;
      finalData[i + 1] = binarized;
      finalData[i + 2] = binarized;
    }
    
    ctx.putImageData(finalImageData, 0, 0);

    const blob = await canvasToBlob(canvas);
    return blob || file;
  } catch {
    return file;
  }
}

// AI-based text correction for OCR errors
function applyAITextCorrection(text: string): string {
  let corrected = text;
  
  // Common OCR character confusions and their corrections
  const corrections: Record<string, string> = {
    '0': 'O', // In context of letters
    '1': 'I', // In context of letters
    '5': 'S', // In context of letters
    '8': 'B', // In context of letters
    '|': 'I', // Vertical bar often misread as I
    'l': '1', // Lowercase L often misread as 1
    'O': '0', // In context of numbers
    'I': '1', // In context of numbers
    'S': '5', // In context of numbers
    'B': '8', // In context of numbers
    'Z': '2', // In context of numbers
    'z': '2', // In context of numbers
    'G': '6', // In context of numbers
    'g': '9', // In context of numbers
    'q': '9', // In context of numbers
    'Q': '0', // In context of numbers
  };
  
  // Context-aware corrections based on surrounding text
  const lines = corrected.split('\n');
  const correctedLines = lines.map(line => {
    // Skip lines that are mostly numbers (likely amounts)
    const numberCount = (line.match(/\d/g) || []).length;
    const letterCount = (line.match(/[a-zA-Z]/g) || []).length;
    
    if (numberCount > letterCount * 2) {
      // This is likely a number line - fix number-related OCR errors
      return line
        .replace(/[Oo]/g, '0')
        .replace(/[Ii|l]/g, '1')
        .replace(/[Ss]/g, '5')
        .replace(/[Bb]/g, '8')
        .replace(/[Zz]/g, '2')
        .replace(/[Gg]/g, '6')
        .replace(/[q]/g, '9');
    } else if (letterCount > numberCount * 2) {
      // This is likely a text line - fix letter-related OCR errors
      return line
        .replace(/[0]/g, 'O')
        .replace(/[1]/g, 'I')
        .replace(/[5]/g, 'S')
        .replace(/[8]/g, 'B')
        .replace(/[|]/g, 'I');
    }
    
    // Mixed line - apply smart corrections
    return line;
  });
  
  corrected = correctedLines.join('\n');
  
  // Fix common receipt-specific OCR errors
  corrected = corrected
    .replace(/T0TAL/gi, 'TOTAL')
    .replace(/T0TAI/gi, 'TOTAL')
    .replace(/T0T/gi, 'TOT')
    .replace(/AM0UNT/gi, 'AMOUNT')
    .replace(/AM0UN7/gi, 'AMOUNT')
    .replace(/PAlD/gi, 'PAID')
    .replace(/PAID/gi, 'PAID')
    .replace(/SUBT0TAL/gi, 'SUBTOTAL')
    .replace(/SUBT0TAI/gi, 'SUBTOTAL')
    .replace(/DlSC0UNT/gi, 'DISCOUNT')
    .replace(/DlSC0UN7/gi, 'DISCOUNT')
    .replace(/TAX/gi, 'TAX')
    .replace(/G5T/gi, 'GST')
    .replace(/C65T/gi, 'CGST')
    .replace(/S65T/gi, 'SGST')
    .replace(/lGST/gi, 'IGST')
    .replace(/lNVOlCE/gi, 'INVOICE')
    .replace(/lNVOlCE/gi, 'INVOICE')
    .replace(/RECElPT/gi, 'RECEIPT')
    .replace(/RECElP7/gi, 'RECEIPT')
    .replace(/lTEM/gi, 'ITEM')
    .replace(/l7EM/gi, 'ITEM')
    .replace(/QUANTlTY/gi, 'QUANTITY')
    .replace(/QUANTl7Y/gi, 'QUANTITY')
    .replace(/PRlCE/gi, 'PRICE')
    .replace(/PRlCE/gi, 'PRICE')
    .replace(/RATE/gi, 'RATE')
    .replace(/AMT/gi, 'AMT')
    .replace(/AM7/gi, 'AMT')
    .replace(/DAlE/gi, 'DATE')
    .replace(/D7E/gi, 'DATE')
    .replace(/TlME/gi, 'TIME')
    .replace(/TlME/gi, 'TIME')
    .replace(/BILL/gi, 'BILL')
    .replace(/BllL/gi, 'BILL')
    .replace(/0RDER/gi, 'ORDER')
    .replace(/0RDER/gi, 'ORDER')
    .replace(/CASHlER/gi, 'CASHIER')
    .replace(/CASHlER/gi, 'CASHIER')
    .replace(/PAYMENT/gi, 'PAYMENT')
    .replace(/PAYMEN7/gi, 'PAYMENT')
    .replace(/CHANGE/gi, 'CHANGE')
    .replace(/CHANGE/gi, 'CHANGE')
    .replace(/BALANCE/gi, 'BALANCE')
    .replace(/BALANCE/gi, 'BALANCE')
    .replace(/THANK/gi, 'THANK')
    .replace(/THANK/gi, 'THANK')
    .replace(/Y0U/gi, 'YOU')
    .replace(/Y0U/gi, 'YOU')
    .replace(/PLEASE/gi, 'PLEASE')
    .replace(/PLEASE/gi, 'PLEASE')
    .replace(/VlSlT/gi, 'VISIT')
    .replace(/VlSIT/gi, 'VISIT')
    .replace(/AGAlN/gi, 'AGAIN')
    .replace(/AGAlN/gi, 'AGAIN')
    .replace(/Z0MAT0/gi, 'ZOMATO')
    .replace(/Z0MAT0/gi, 'ZOMATO')
    .replace(/SWlGGY/gi, 'SWIGGY')
    .replace(/SWlGGY/gi, 'SWIGGY')
    .replace(/UBER/gi, 'UBER')
    .replace(/UBER/gi, 'UBER')
    .replace(/EATS/gi, 'EATS')
    .replace(/EATS/gi, 'EATS')
    .replace(/D0MlN0/gi, 'DOMINO')
    .replace(/D0MlN0/gi, 'DOMINO')
    .replace(/D0RDASH/gi, 'DOORDASH')
    .replace(/D0RDASH/gi, 'DOORDASH');
  
  // Fix currency symbol OCR errors
  corrected = corrected
    .replace(/Rs\./gi, '₹')
    .replace(/RS\./gi, '₹')
    .replace(/INR/gi, '₹')
    .replace(/lNR/gi, '₹')
    .replace(/r\.\s*s/gi, '₹')
    .replace(/R\s*S/gi, '₹');
  
  // Fix decimal point OCR errors
  corrected = corrected
    .replace(/(\d)[.,](\d)/g, '$1.$2') // Ensure decimal points are correct
    .replace(/(\d{2,})[.,](\d{2,})/g, '$1.$2'); // Fix thousands separators
  
  // Remove extra spaces and clean up
  corrected = corrected
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/gm, '')
    .replace(/\n\s*\n/g, '\n');
  
  return corrected;
}

export function ReceiptScanPanel({ onScanComplete, currency }: ReceiptScanPanelProps) {
  const currencySymbol = getCurrencySymbol();
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
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
        const { createWorker, PSM, OEM } = await import('tesseract.js');
        const worker = await createWorker('eng', OEM.LSTM_ONLY, {
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
        
        // Advanced Tesseract configuration for receipt scanning with column detection
        await worker.setParameters({
          // Page segmentation mode - AUTO for flexible layout detection
          tessedit_pageseg_mode: PSM.AUTO,
          
          // Preserve interword spaces for better text extraction
          preserve_interword_spaces: '1',
          
          // Set high DPI for better resolution
          user_defined_dpi: '300',
          
          // Character whitelist for receipt text (numbers, letters, currency symbols, common punctuation)
          tessedit_char_whitelist: '0123456789.+-₹$%abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ,.:;()[]{}-_=+*/&@#!?/-',
          
          // Enable dictionary for better word recognition
          load_system_dawg: '1',
          load_freq_dawg: '1',
          
          // Improve text line detection
          textord_force_make_prop_words: '0',
          
          // Enable adaptive thresholding
          tessedit_do_invert: '0',
          
          // Improve character recognition
          tessedit_tessedit_char_blacklist: '|\\^~`',
          
          // Enable better handling of skewed text
          textord_baseline_debug: '0',
          
          // Improve number recognition
          tessedit_reject_mode: '0',
          
          // Enable better handling of small text
          min_characters_to_try: '3',
          
          // Improve handling of mixed text and numbers
          classify_char_norm_range: '0.2',
          
          // Enable better word segmentation
          words_max_x_gap: '3',
          
          // Improve line detection
          textord_heavy_nr: '1',
          
          // Enable better handling of noise
          noise_maxperblob: '0',
          
          // Improve character classification
          classify_enable_adaptive_matcher: '1',
          
          // Enable better handling of different fonts
          classify_enable_learning: '0',
          
          // Improve text recognition quality
          tessedit_ocr_engine_mode: '1',
          
          // Column detection improvements
          textord_tabfind_find_verticals: '1',
          textord_use_box_tabs: '1',
          textord_tabfind_vertical_text: '1',
          textord_tabfind_aligned_gap_fraction: '0.5',
          
          // Improve table/column structure detection
          textord_tablefind_recognize_tables: '1',
          
          // Better handling of multi-column layouts
          textord_debug_tabfind: '0',
          
          // Improve spacing detection
          textord_debug_printable: '0',
          
          // Enable better text block detection
          textord_debug_baselines: '0',
          
          // Improve word spacing
          textord_words_default_min_x_gap: '2',
          textord_words_default_max_x_gap: '10',
          
          // Better line spacing
          textord_lines_default_max_y_gap: '2',
          
          // Improve character spacing
          textord_words_min_gap: '2',
          
          // Enable better handling of overlapping text
          textord_overlap_x: '0',
          
          // Improve text orientation detection
          textord_min_linesize: '2.5',
          
          // Better handling of small characters
          textord_min_blob_height: '5',
          
          // Improve text block detection
          textord_debug_blocks: '0',
          
          // Enable better word formation
          textord_fpt_kerning: '0',
          
          // Improve character recognition for receipts
          textord_debug_make_prop_words: '0',
          
          // Better handling of numbers in text
          textord_digits_only: '0',
          
          // Improve detection of price columns
          textord_tabfind_vertical_gap_ratio: '0.5',
        });

        setProgressLabel('Preparing image…');
        const ocrImage = await preprocessImageForOcr(file);

        setProgressLabel('Reading receipt…');
        const {
          data: { text },
        } = await worker.recognize(ocrImage);
        await worker.terminate();

        // Apply AI-based text correction
        const correctedText = applyAITextCorrection(text);

        const parsed = parseReceiptText(correctedText, currency);
        const amountStr =
          parsed.amount !== null ? parsed.amount.toFixed(2) : '';

        const result: ReceiptScanResult = {
          description: parsed.description,
          amount: amountStr,
          notes: parsed.notes,
          itemCount: parsed.itemCount,
          confidence: parsed.confidence,
          warnings: parsed.warnings,
          taxInfo: parsed.taxInfo,
        };

        setScanResult(result);
        setEditDescription(parsed.description);
        setEditAmount(amountStr);
        setEditNotes(parsed.notes);
        setShowReviewModal(true);

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
    [onScanComplete, currency],
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
    // Higher resolution for better OCR accuracy
    const scale = 3;
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Advanced preprocessing: same pipeline as file upload
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Step 1: Initial enhancement with advanced filters
    ctx.filter = 'grayscale(1) contrast(3.0) brightness(1.2) saturate(1.5)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Step 2: Pixel-level processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Step 3: Advanced adaptive thresholding with local window
    const windowSize = 15;
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const value = data[idx];
        
        // Calculate local threshold using surrounding pixels
        let localSum = 0;
        let localCount = 0;
        
        for (let wy = -halfWindow; wy <= halfWindow; wy++) {
          for (let wx = -halfWindow; wx <= halfWindow; wx++) {
            const ny = y + wy;
            const nx = x + wx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const nIdx = (ny * width + nx) * 4;
              localSum += data[nIdx];
              localCount++;
            }
          }
        }
        
        const localMean = localSum / localCount;
        const threshold = localMean * 0.85;
        
        // Apply adaptive thresholding
        const binarized = value < threshold ? Math.max(0, value - 70) : Math.min(255, value + 50);
        
        data[idx] = binarized;
        data[idx + 1] = binarized;
        data[idx + 2] = binarized;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Step 4: Apply morphological operations for noise reduction
    // Dilate to connect text regions
    const dilatedData = ctx.getImageData(0, 0, width, height);
    const dilatedPixels = dilatedData.data;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        let maxVal = 0;
        
        // 3x3 dilation kernel
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            maxVal = Math.max(maxVal, data[nIdx]);
          }
        }
        
        dilatedPixels[idx] = maxVal;
        dilatedPixels[idx + 1] = maxVal;
        dilatedPixels[idx + 2] = maxVal;
      }
    }
    
    ctx.putImageData(dilatedData, 0, 0);

    // Step 5: Erosion to remove small noise
    const erodedData = ctx.getImageData(0, 0, width, height);
    const erodedPixels = erodedData.data;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        let minVal = 255;
        
        // 3x3 erosion kernel
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            minVal = Math.min(minVal, dilatedPixels[nIdx]);
          }
        }
        
        erodedPixels[idx] = minVal;
        erodedPixels[idx + 1] = minVal;
        erodedPixels[idx + 2] = minVal;
      }
    }
    
    ctx.putImageData(erodedData, 0, 0);

    // Step 6: Sharpening for text edge enhancement
    ctx.filter = 'contrast(1.3) brightness(1.08) saturate(1.2)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    // Step 7: Final aggressive binarization for OCR
    const finalImageData = ctx.getImageData(0, 0, width, height);
    const finalData = finalImageData.data;
    
    for (let i = 0; i < finalData.length; i += 4) {
      const value = finalData[i];
      // Strong binarization with slight bias toward black
      const binarized = value < 135 ? Math.max(0, value - 80) : Math.min(255, value + 50);
      finalData[i] = binarized;
      finalData[i + 1] = binarized;
      finalData[i + 2] = binarized;
    }
    ctx.putImageData(finalImageData, 0, 0);

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

  const handleConfirmScan = () => {
    if (scanResult) {
      onScanComplete({
        ...scanResult,
        description: editDescription,
        amount: editAmount,
        notes: editNotes,
      });
    }
    setShowReviewModal(false);
    setScanResult(null);
  };

  const handleCancelReview = () => {
    setShowReviewModal(false);
    setScanResult(null);
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

      {/* Review Modal */}
      {showReviewModal && scanResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-purple-500" />
                  Review & Edit Scanned Receipt
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Verify and edit the extracted details before adding
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelReview}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white"
                aria-label="Close review"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Confidence Indicator */}
            <div className={`mb-4 p-3 rounded-lg ${
              scanResult.confidence === 'high' 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                : scanResult.confidence === 'medium'
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  scanResult.confidence === 'high' 
                    ? 'text-emerald-700 dark:text-emerald-400' 
                    : scanResult.confidence === 'medium'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-rose-700 dark:text-rose-400'
                }`}>
                  AI Confidence: {scanResult.confidence.toUpperCase()}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  • {scanResult.itemCount} items detected
                </span>
              </div>
              {scanResult.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {scanResult.warnings.map((warning, index) => (
                    <p key={index} className="text-xs text-amber-700 dark:text-amber-400">
                      ⚠️ {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Tax Breakdown */}
            {scanResult.taxInfo.totalTax && scanResult.taxInfo.totalTax > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-400 mb-2">
                  Tax Breakdown
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {scanResult.taxInfo.sgst && (
                    <div className="flex justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300">SGST:</span>
                      <span className="text-emerald-900 dark:text-emerald-100 font-medium">
                        {currencySymbol}{scanResult.taxInfo.sgst.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {scanResult.taxInfo.cgst && (
                    <div className="flex justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300">CGST:</span>
                      <span className="text-emerald-900 dark:text-emerald-100 font-medium">
                        {currencySymbol}{scanResult.taxInfo.cgst.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {scanResult.taxInfo.igst && (
                    <div className="flex justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300">IGST:</span>
                      <span className="text-emerald-900 dark:text-emerald-100 font-medium">
                        {currencySymbol}{scanResult.taxInfo.igst.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {scanResult.taxInfo.gst && !scanResult.taxInfo.sgst && !scanResult.taxInfo.cgst && !scanResult.taxInfo.igst && (
                    <div className="flex justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300">GST:</span>
                      <span className="text-emerald-900 dark:text-emerald-100 font-medium">
                        {currencySymbol}{scanResult.taxInfo.gst.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between col-span-2 border-t border-emerald-300 dark:border-emerald-700 pt-2 mt-1">
                    <span className="text-emerald-900 dark:text-emerald-100 font-semibold">Total Tax:</span>
                    <span className="text-emerald-900 dark:text-emerald-100 font-bold">
                      {currencySymbol}{scanResult.taxInfo.totalTax.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full"
                  placeholder="Enter a brief description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Amount ({currencySymbol})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Itemized Details)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  maxLength={700}
                  rows={8}
                  className="w-full min-h-[190px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Scanned item names and prices will appear here..."
                />
                <div className="mt-1 text-right text-[11px] text-slate-400">
                  {editNotes.length}/700
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 justify-end">
              <Button
                type="button"
                onClick={handleCancelReview}
                className="bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmScan}
                className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white"
              >
                <Check className="mr-2 h-4 w-4" />
                Confirm & Add Expense
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
