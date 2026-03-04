'use client';

import { useEffect, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/50 bg-white rounded-2xl shadow-xl p-0 w-[90vw] max-w-md"
    >
      <div className="p-5">
        {title && <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>}
        {children}
      </div>
    </dialog>
  );
}
