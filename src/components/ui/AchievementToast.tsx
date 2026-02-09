import { memo, useEffect, useState } from 'react';
import type { AchievementDef } from '../../lib/achievements';

interface AchievementToastProps {
  achievement: AchievementDef;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

function AchievementToastInner({ achievement, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next frame
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for exit animation before unmounting
      setTimeout(onDismiss, 300);
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`achievement-toast${visible ? ' achievement-toast--visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="achievement-toast__icon" aria-hidden="true">
        {achievement.icon}
      </span>
      <div className="achievement-toast__content">
        <span className="achievement-toast__label">Achievement Unlocked!</span>
        <span className="achievement-toast__name">{achievement.name}</span>
      </div>
    </div>
  );
}

export const AchievementToast = memo(AchievementToastInner);
