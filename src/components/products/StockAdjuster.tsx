'use client';

import { useRef, useCallback } from 'react';

interface StockAdjusterProps {
  currentStock: number;
  onAdjust: (quantity: number) => void;
  size?: 'sm' | 'lg';
  unit?: string;
}

export function StockAdjuster({ currentStock, onAdjust, size = 'sm', unit }: StockAdjusterProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const startLongPress = useCallback(
    (amount: number) => {
      timerRef.current = setTimeout(() => {
        // After 500ms, start rapid adjustments
        intervalRef.current = setInterval(() => {
          onAdjust(amount);
          triggerHaptic();
        }, 150);
      }, 500);
    },
    [onAdjust]
  );

  const stopLongPress = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
  }, []);

  const handleClick = (amount: number) => {
    onAdjust(amount);
    triggerHaptic();
  };

  const isLarge = size === 'lg';
  const btnClass = isLarge
    ? 'w-16 h-16 text-2xl font-bold rounded-xl'
    : 'w-10 h-10 text-lg font-bold rounded-lg';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleClick(-1)}
        onMouseDown={() => startLongPress(-1)}
        onMouseUp={stopLongPress}
        onMouseLeave={stopLongPress}
        onTouchStart={() => startLongPress(-1)}
        onTouchEnd={stopLongPress}
        disabled={currentStock <= 0}
        className={`${btnClass} bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors select-none`}
      >
        −
      </button>
      <div className={`text-center ${isLarge ? 'min-w-[80px]' : 'min-w-[48px]'}`}>
        <span className={`font-semibold ${isLarge ? 'text-3xl' : 'text-lg'} text-gray-900`}>
          {Number.isInteger(currentStock) ? currentStock : currentStock.toFixed(1)}
        </span>
        {unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
      </div>
      <button
        onClick={() => handleClick(1)}
        onMouseDown={() => startLongPress(1)}
        onMouseUp={stopLongPress}
        onMouseLeave={stopLongPress}
        onTouchStart={() => startLongPress(1)}
        onTouchEnd={stopLongPress}
        className={`${btnClass} bg-green-50 text-green-600 hover:bg-green-100 active:bg-green-200 transition-colors select-none`}
      >
        +
      </button>
    </div>
  );
}
