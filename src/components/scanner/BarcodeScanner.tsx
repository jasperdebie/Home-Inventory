'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import type { CameraDevice } from 'html5-qrcode/esm/camera/core';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  active: boolean;
}

export function BarcodeScanner({ onScan, active }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const lastScanRef = useRef('');
  const containerId = 'barcode-scanner';

  // Fetch available cameras when component becomes active
  useEffect(() => {
    if (!active) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0 && !selectedCameraId) {
          // Default to the last camera (usually the back/environment camera)
          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCamera?.id ?? devices[devices.length - 1].id);
        }
      })
      .catch((err) => {
        console.error('Failed to list cameras:', err);
        setError('Camera access denied. Please allow camera permissions.');
      });
  }, [active, selectedCameraId]);

  // Start scanner when camera is selected
  useEffect(() => {
    if (!active || !selectedCameraId) return;

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (decodedText !== lastScanRef.current) {
            lastScanRef.current = decodedText;
            if (navigator.vibrate) navigator.vibrate(100);
            onScanRef.current(decodedText);
          }
        },
        () => {}
      )
      .catch((err) => {
        console.error('Scanner error:', err);
        setError('Failed to start camera. Please try another camera.');
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [active, selectedCameraId]);

  const handleCameraChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCameraId(e.target.value);
      setError(null);
      lastScanRef.current = '';
    },
    []
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
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
      <div
        id={containerId}
        className="w-full rounded-xl overflow-hidden bg-black"
        style={{ minHeight: 300 }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl">
          <p className="text-white text-sm text-center px-4">{error}</p>
        </div>
      )}
    </div>
  );
}
