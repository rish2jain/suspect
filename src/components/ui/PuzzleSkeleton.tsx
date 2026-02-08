import { memo } from 'react';

function PuzzleSkeletonInner() {
  return (
    <div className="puzzle-skeleton" aria-busy="true" aria-label="Loading puzzle">
      {/* Banner skeleton */}
      <div className="puzzle-skeleton__banner">
        <div className="skeleton-line skeleton-line--xs" style={{ width: '120px' }} />
        <div className="skeleton-line skeleton-line--lg" style={{ width: '200px', marginTop: '8px' }} />
        <div className="skeleton-line" style={{ width: '80%', marginTop: '8px' }} />
      </div>

      {/* Stars bar skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <div className="skeleton-line skeleton-line--xs" style={{ width: '48px' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-circle" />
          ))}
        </div>
      </div>

      {/* Suspect card skeletons */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="puzzle-skeleton__card">
            <div className="skeleton-avatar" />
            <div style={{ flex: 1 }}>
              <div className="skeleton-line" style={{ width: `${130 + i * 20}px` }} />
              <div className="skeleton-line skeleton-line--xs" style={{ width: '90px', marginTop: '6px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const PuzzleSkeleton = memo(PuzzleSkeletonInner);
