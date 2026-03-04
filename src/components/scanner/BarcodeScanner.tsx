'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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

  const showScanner = active && polyfillReady && ScannerComponent && selectedCameraId;

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
        className="w-full rounded-xl overflow-hidden bg-black"
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
      </div>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl">
          <p className="text-white text-sm text-center px-4">{error}</p>
        </div>
      )}
    </div>
  );
}
