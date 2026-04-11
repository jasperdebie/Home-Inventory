'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  active: boolean;
}

interface CameraInfo {
  deviceId: string;
  label: string;
}

const FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'qr_code',
];

export function BarcodeScanner({ onScan, active }: BarcodeScannerProps) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const lastScanRef = useRef('');
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polyfillReady, setPolyfillReady] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ScannerComponent, setScannerComponent] = useState<any>(null);

  // Load polyfill first, then the scanner component
  useEffect(() => {
    let cancelled = false;
    async function load() {
      await import('react-barcode-scanner/polyfill');
      if (cancelled) return;
      setPolyfillReady(true);
      const mod = await import('react-barcode-scanner');
      if (cancelled) return;
      setScannerComponent(() => mod.BarcodeScanner);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Enumerate cameras
  useEffect(() => {
    if (!active) return;

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((tempStream) => {
        tempStream.getTracks().forEach((t) => t.stop());
        return navigator.mediaDevices.enumerateDevices();
      })
      .then((devices) => {
        const videoDevices = devices
          .filter((d) => d.kind === 'videoinput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${i + 1}`,
          }));
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          const backCam = videoDevices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam?.deviceId ?? videoDevices[videoDevices.length - 1].deviceId);
        }
      })
      .catch(() => {
        setError('Camera access denied. Please allow camera permissions.');
      });
  }, [active, selectedCameraId]);

  const showScanner = active && polyfillReady && ScannerComponent && selectedCameraId;

  // Detect torch support and apply torch state
  useEffect(() => {
    if (!showScanner) {
      setTorchSupported(false);
      setTorchOn(false);
      return;
    }

    // Wait for the video element to have an active stream
    const timer = setTimeout(() => {
      const container = scannerContainerRef.current;
      if (!container) return;
      const video = container.querySelector('video');
      if (!video || !video.srcObject) return;

      const stream = video.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const capabilities = track.getCapabilities() as any;
      if (capabilities?.torch) {
        setTorchSupported(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScanner, selectedCameraId]);

  const toggleTorch = useCallback(async () => {
    const container = scannerContainerRef.current;
    if (!container) return;
    const video = container.querySelector('video');
    if (!video || !video.srcObject) return;

    const stream = video.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const newTorchState = !torchOn;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [{ torch: newTorchState } as any] });
      setTorchOn(newTorchState);
    } catch {
      // Torch not supported or failed
    }
  }, [torchOn]);

  // Turn off torch when scanner becomes inactive
  useEffect(() => {
    if (!active && torchOn) {
      setTorchOn(false);
    }
  }, [active, torchOn]);

  const handleCapture = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (barcodes: any[]) => {
      if (barcodes.length === 0) return;
      const value = barcodes[0].rawValue;
      if (value && value !== lastScanRef.current) {
        lastScanRef.current = value;
        if (navigator.vibrate) navigator.vibrate(100);
        onScanRef.current(value);
      }
    },
    []
  );

  const handleCameraChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCameraId(e.target.value);
      setError(null);
      lastScanRef.current = '';
    },
    []
  );

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const value = manualBarcode.trim();
      if (value) {
        onScanRef.current(value);
        setManualBarcode('');
      }
    },
    [manualBarcode]
  );

  return (
    <div className="relative">
      {cameras.length > 1 && (
        <div className="mb-2">
          <select
            value={selectedCameraId ?? ''}
            onChange={handleCameraChange}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm border border-gray-200 dark:border-gray-700"
          >
            {cameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div
        ref={scannerContainerRef}
        className="relative w-full rounded-xl overflow-hidden bg-black"
        style={{ minHeight: 300 }}
      >
        {showScanner && (
          <ScannerComponent
            onCapture={handleCapture}
            options={{
              formats: FORMATS,
              delay: 300,
            }}
            trackConstraints={{
              deviceId: { exact: selectedCameraId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 300 }}
          />
        )}
        {torchSupported && showScanner && (
          <button
            type="button"
            onClick={toggleTorch}
            className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-colors ${
              torchOn
                ? 'bg-yellow-400 text-gray-900'
                : 'bg-gray-800/70 text-white'
            }`}
            title={torchOn ? 'Zaklamp uit' : 'Zaklamp aan'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {torchOn ? (
                <>
                  <path d="M9 2h6l-1 6h3l-7 10 1-6H8z" fill="currentColor" />
                </>
              ) : (
                <path d="M9 2h6l-1 6h3l-7 10 1-6H8z" />
              )}
            </svg>
          </button>
        )}
      </div>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl">
          <p className="text-white text-sm text-center px-4">{error}</p>
        </div>
      )}

      <div className="mt-2 text-center text-sm text-gray-400">or enter manually</div>
      <form onSubmit={handleManualSubmit} className="mt-1 flex gap-2">
        <Input
          placeholder="Type barcode..."
          value={manualBarcode}
          onChange={(e) => setManualBarcode(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!manualBarcode.trim()}>
          Look Up
        </Button>
      </form>
    </div>
  );
}
