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
  const [permissionDenied, setPermissionDenied] = useState(false);
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

  // Enumerate cameras (only once when active and no cameras enumerated yet)
  useEffect(() => {
    if (!active || cameras.length > 0) return;

    setError(null);
    setPermissionDenied(false);
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
        if (videoDevices.length > 0) {
          const backCam = videoDevices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam?.deviceId ?? videoDevices[videoDevices.length - 1].deviceId);
        }
      })
      .catch(async () => {
        // Check if permission is permanently denied
        let denied = false;
        try {
          const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
          denied = status.state === 'denied';
        } catch {
          // permissions.query not supported, assume denied
          denied = true;
        }
        setPermissionDenied(denied);
        setError('Camera access denied');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, cameras.length]);

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

  const retryCamera = useCallback(() => {
    setError(null);
    setPermissionDenied(false);
    setCameras([]);
    setSelectedCameraId(null);
  }, []);

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
                <path d="M9 2h6l-1 6h3l-7 10 1-6H8z" fill="currentColor" />
              ) : (
                <path d="M9 2h6l-1 6h3l-7 10 1-6H8z" />
              )}
            </svg>
          </button>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 rounded-xl z-20 px-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4">
              <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <p className="text-white font-medium text-center mb-2">
              Camera toegang geweigerd
            </p>
            {permissionDenied ? (
              <div className="text-gray-300 text-sm text-center space-y-3">
                <p>De camera-toestemming is geblokkeerd. Wijzig dit in je instellingen:</p>
                <ol className="text-left text-xs space-y-1 text-gray-400">
                  <li>1. Tik op het slot-icoon in de adresbalk</li>
                  <li>2. Ga naar <strong className="text-gray-300">Machtigingen</strong> of <strong className="text-gray-300">Site-instellingen</strong></li>
                  <li>3. Zet <strong className="text-gray-300">Camera</strong> op Toestaan</li>
                  <li>4. Herlaad de pagina</li>
                </ol>
                <div className="flex gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Pagina herladen
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-300 text-sm text-center space-y-3">
                <p>Sta camera-toegang toe om barcodes te scannen.</p>
                <button
                  type="button"
                  onClick={retryCamera}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Opnieuw proberen
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
