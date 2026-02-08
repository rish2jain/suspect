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
            {isFilled || isLosing ? '\u2B50' : '\u25CB'}
          </span>
        );
      })}
    </span>
  );
}

export const StarsDisplay = memo(StarsDisplayInner);
