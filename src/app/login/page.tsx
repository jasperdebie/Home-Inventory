'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP_NAME } from '@/lib/constants';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDigit = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length >= 4) {
      submitPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const submitPin = async (value: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: value }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Wrong PIN');
        setPin('');
      }
    } catch {
      setError('Connection error');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xs">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">{APP_NAME}</h1>
        <p className="text-sm text-center text-gray-500 mb-8">Enter PIN to continue</p>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'del') {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  disabled={loading}
                  className="h-14 rounded-xl text-gray-600 text-lg font-medium hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                disabled={loading}
                className="h-14 rounded-xl bg-white border border-gray-200 text-gray-900 text-xl font-medium
                  hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
