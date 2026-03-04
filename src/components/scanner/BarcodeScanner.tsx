'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  active: boolean;
}

export function BarcodeScanner({ onScan, active }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastScanRef = useRef('');
  const containerId = 'barcode-scanner';

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Debounce: don't trigger same barcode twice in a row
          if (decodedText !== lastScanRef.current) {
            lastScanRef.current = decodedText;
            if (navigator.vibrate) navigator.vibrate(100);
            onScan(decodedText);
          }
        },
        () => {
          // Ignore scan failures (no barcode in frame)
        }
      )
      .catch((err) => {
        console.error('Scanner error:', err);
        setError('Camera access denied. Please allow camera permissions.');
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [active, onScan]);

  return (
    <div className="relative">
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
