import { memo, useState, useCallback, useRef } from 'react';
import type { ShareData } from '../../lib/types';
import { generateShareText } from '../../lib/puzzleUtils';
import { generateShareImage } from '../../lib/shareImage';

interface ShareButtonProps {
  shareData: ShareData;
}

function ShareButtonInner({ shareData }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [imageStatus, setImageStatus] = useState<'idle' | 'generating' | 'done'>('idle');
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markCopied = useCallback(() => {
    setCopied(true);
    setFallbackText(null);

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 2000);
  }, []);

  const handleCopy = useCallback(async () => {
    const text = generateShareText(shareData);

    // M4: Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ text });
        markCopied();
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fall back to clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        markCopied();
      } catch {
        // Clipboard API failed, show fallback textarea
        setFallbackText(text);
      }
    } else {
      // Clipboard API not available, show fallback textarea
      setFallbackText(text);
    }
  }, [shareData, markCopied]);

  const handleShareImage = useCallback(async () => {
    setImageStatus('generating');

    try {
      const blob = await generateShareImage(shareData);
      const file = new File([blob], 'suspect-result.png', { type: 'image/png' });

      // Try native share with file (mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            text: 'Can you crack the case?\nplay.suspect.game',
          });
          setImageStatus('done');
          if (imageTimerRef.current !== null) clearTimeout(imageTimerRef.current);
          imageTimerRef.current = setTimeout(() => setImageStatus('idle'), 2000);
          return;
        } catch {
          // User cancelled — fall through to download
        }
      }

      // Fallback: trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'suspect-result.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setImageStatus('done');
      if (imageTimerRef.current !== null) clearTimeout(imageTimerRef.current);
      imageTimerRef.current = setTimeout(() => setImageStatus('idle'), 2000);
    } catch {
      setImageStatus('idle');
    }
  }, [shareData]);

  const handleFallbackFocus = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      e.target.select();
    },
    [],
  );

  return (
    <div>
      <div className="share-buttons-row">
        <button
          type="button"
          className={`btn btn-action${copied ? ' btn-action--copied' : ''}`}
          onClick={handleCopy}
          aria-live="polite"
        >
          {copied ? '\u2713 Copied!' : 'Share Text'}
        </button>
        <button
          type="button"
          className={`btn btn-ghost${imageStatus === 'done' ? ' btn-action--copied' : ''}`}
          onClick={handleShareImage}
          disabled={imageStatus === 'generating'}
          aria-live="polite"
        >
          {imageStatus === 'generating'
            ? 'Creating...'
            : imageStatus === 'done'
              ? '\u2713 Saved!'
              : 'Share Image'}
        </button>
      </div>

      {fallbackText !== null && (
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <label className="text-sm text-muted" htmlFor="share-fallback">
            Copy the text below:
          </label>
          <textarea
            id="share-fallback"
            readOnly
            value={fallbackText}
            onFocus={handleFallbackFocus}
            rows={10}
            style={{
              width: '100%',
              marginTop: '4px',
              padding: 'var(--space-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text)',
              resize: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

export const ShareButton = memo(ShareButtonInner);
