import { memo, useEffect, useReducer } from 'react';

interface StarsDisplayProps {
  filled: number;
  total?: number;
  size?: 'sm' | 'lg';
}

interface AnimState {
  prev: number;
  current: number;
  losingIndex: number;
}

type AnimAction =
  | { type: 'UPDATE'; value: number }
  | { type: 'CLEAR_ANIMATION' };

function animReducer(state: AnimState, action: AnimAction): AnimState {
  switch (action.type) {
    case 'UPDATE': {
      const losing = action.value < state.current ? action.value : -1;
      return { prev: state.current, current: action.value, losingIndex: losing };
    }
    case 'CLEAR_ANIMATION':
      return { ...state, losingIndex: -1 };
  }
}

function StarIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function StarsDisplayInner({ filled, total = 4, size = 'sm' }: StarsDisplayProps) {
  const clamped = Math.max(0, Math.min(filled, total));

  const [anim, dispatch] = useReducer(animReducer, {
    prev: clamped,
    current: clamped,
    losingIndex: -1,
  });

  // Dispatch UPDATE when clamped changes
  useEffect(() => {
    dispatch({ type: 'UPDATE', value: clamped });
  }, [clamped]);

  // Clear losing animation after timeout
  useEffect(() => {
    if (anim.losingIndex < 0) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_ANIMATION' }), 450);
    return () => clearTimeout(timer);
  }, [anim.losingIndex]);

  return (
    <span
      className={`stars${size === 'lg' ? ' stars--lg' : ''}`}
      aria-label={`${clamped} of ${total} stars`}
      role="img"
    >
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < clamped;
        const isLosing = i === anim.losingIndex;

        return (
          <span
            key={i}
            className={[
              'stars__star',
              isFilled && 'stars__star--filled',
              isLosing && 'stars__star--losing',
            ].filter(Boolean).join(' ')}
            aria-hidden="true"
          >
            <StarIcon filled={isFilled || isLosing} />
          </span>
        );
      })}
    </span>
  );
}

export const StarsDisplay = memo(StarsDisplayInner);
