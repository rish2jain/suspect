import { useEffect, useRef, useCallback, memo } from 'react';

interface AccusationOverlayProps {
  suspectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function AccusationOverlayInner({
  suspectName,
  onConfirm,
  onCancel,
}: AccusationOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Capture the previously focused element and restore on unmount
  useEffect(() => {
    previousFocusRef.current = document.activeElement;

    // Focus the cancel button on open (safer default)
    cancelBtnRef.current?.focus();

    return () => {
      // Restore focus on close
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Escape key to cancel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Focus trap within overlay
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first, go to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last, go to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [],
  );

  // Click on backdrop to cancel
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel],
  );

  return (
    <div
      className="accusation-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accusation-title"
      aria-describedby="accusation-warning"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="accusation-overlay__content" ref={dialogRef}>
        {/* Warning icon */}
        <div className="accusation-overlay__icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="currentColor" width="48" height="48">
            <path d="M24 4C12.96 4 4 12.96 4 24s8.96 20 20 20 20-8.96 20-20S35.04 4 24 4zm2 30h-4v-4h4v4zm0-8h-4V14h4v12z" />
          </svg>
        </div>

        <h2 className="accusation-overlay__title" id="accusation-title">
          Are you sure?
        </h2>

        <p className="accusation-overlay__suspect-name">
          Accuse {suspectName}
        </p>

        <p className="accusation-overlay__warning" id="accusation-warning">
          This action cannot be undone. You only get one guess per puzzle.
        </p>

        <div className="accusation-overlay__actions">
          <button
            className="btn btn-ghost btn-full"
            onClick={onCancel}
            ref={cancelBtnRef}
            type="button"
          >
            Go Back
          </button>
          <button
            className="btn btn-danger btn-full"
            onClick={onConfirm}
            type="button"
          >
            Accuse
          </button>
        </div>
      </div>
    </div>
  );
}

export const AccusationOverlay = memo(AccusationOverlayInner);
