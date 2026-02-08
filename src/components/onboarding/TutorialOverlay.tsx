import { memo, useState, useCallback, useEffect, useRef } from 'react';

interface TutorialOverlayProps {
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: '\u{1F50D}',
    title: 'Read the Alibis',
    body: 'Four suspects. One is lying. Tap each suspect to read their alibi and look for something that doesn\'t add up.',
  },
  {
    icon: '\u2B50',
    title: 'Clues Cost Stars',
    body: 'You start with 4 stars. Each clue you reveal costs one star. Solve with fewer clues for a higher score.',
  },
  {
    icon: '\u2715',
    title: 'Clear Suspects',
    body: 'Long-press (or double-click, or press C on keyboard) a suspect to mark them as cleared. Press S to select a suspect for accusation.',
  },
];

function TutorialOverlayInner({ onDismiss }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Capture previous focus and focus dialog on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    dialogRef.current?.focus();

    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  // Focus trap within the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onDismiss();
    }
  }, [step, onDismiss]);

  const handleSkip = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label="How to play" onKeyDown={handleKeyDown}>
      <div className="tutorial-overlay__content fade-in" ref={dialogRef} tabIndex={-1} key={`content-${step}`}>
        <div className="tutorial-overlay__step" key={step}>
          <div className="tutorial-overlay__icon" aria-hidden="true">
            {current.icon}
          </div>
          <h2 className="tutorial-overlay__title">{current.title}</h2>
          <p className="tutorial-overlay__body">{current.body}</p>
        </div>

        {/* Step indicator for screen readers */}
        <span className="visually-hidden" aria-live="polite">
          Step {step + 1} of {STEPS.length}
        </span>

        <div className="tutorial-overlay__dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`tutorial-overlay__dot${i === step ? ' tutorial-overlay__dot--active' : ''}`}
              style={{ transitionDelay: `${i === step ? 250 : 0}ms` }}
            />
          ))}
        </div>

        <div className="tutorial-overlay__actions">
          <button type="button" className="btn btn-action btn-full" onClick={handleNext}>
            {isLast ? 'Start Playing' : 'Next'}
          </button>
          {!isLast && (
            <button type="button" className="btn btn-ghost btn-full" onClick={handleSkip}>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const TutorialOverlay = memo(TutorialOverlayInner);
