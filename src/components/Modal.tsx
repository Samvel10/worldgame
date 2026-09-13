import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({
  title,
  open,
  onClose,
  children,
  delay = 0,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open && dialog?.open) dialog.close();
    if (open && !dialog?.open) {
      const wait = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : delay;
      if (!wait) {
        dialog?.showModal();
        return;
      }
      const timer = window.setTimeout(() => dialog?.showModal(), wait);
      return () => window.clearTimeout(timer);
    }
  }, [open, delay]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
          ) ?? [],
        );
        const first = focusable[0],
          last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-body">
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" aria-label="Փակել պատուհանը" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
