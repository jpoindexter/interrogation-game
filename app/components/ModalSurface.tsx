'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Native modal semantics provide focus containment, Escape and an inert background. */
export default function ModalSurface({ children, label, onClose }: {
  children: ReactNode;
  label: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onCancel={event => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 text-inherit backdrop:bg-black/40"
    >
      {children}
    </dialog>
  );
}
