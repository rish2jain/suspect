import type { ShareData } from './types';
import { COLORS, GAME_URL } from './constants';
import { formatTime } from './puzzleUtils';

// Card dimensions
const W = 600;
const H = 400;

// Fonts (system stack fallback)
const FONT_BODY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_HEADING = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MONO = '"SF Mono", "Fira Code", monospace';

/**
 * Draw a 5-pointed star using canvas paths.
 * Avoids Unicode star characters that render as tofu on some Android devices.
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  filled: boolean,
  fillColor: string,
  strokeColor: string,
) {
  const innerR = outerR * 0.4;
  const points = 5;
  const step = Math.PI / points;
  // Rotate -90deg so the top point faces up
  const startAngle = -Math.PI / 2;

  ctx.beginPath();
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = startAngle + i * step;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();

  if (filled) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  } else {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/**
 * Render a spoiler-free share image card using Canvas 2D.
 * Returns a PNG Blob.
 */
export async function generateShareImage(data: ShareData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // --- Background ---
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  // --- Header bar ---
  const headerH = 56;
  ctx.fillStyle = COLORS.text;
  ctx.fillRect(0, 0, W, headerH);

  // Header text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 18px ${FONT_HEADING}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `SUSPECT #${String(data.puzzleNumber).padStart(3, '0')}`,
    24,
    headerH / 2,
  );

  // Magnifying glass icon
  ctx.font = `20px ${FONT_BODY}`;
  ctx.fillText('\u{1F50E}', W - 48, headerH / 2);

  // --- Accent line ---
  ctx.fillStyle = COLORS.evidence;
  ctx.fillRect(0, headerH, W, 3);

  // --- Stars + Rating ---
  const starsY = 110;
  const starSize = 28;
  const starGap = 6;
  const totalStarsWidth = 4 * starSize + 3 * starGap;

  // Center the stars row
  const ratingLabel = data.rating;
  ctx.font = `bold 16px ${FONT_HEADING}`;
  const ratingWidth = ctx.measureText(ratingLabel).width;
  const rowWidth = totalStarsWidth + 20 + ratingWidth;
  const starsStartX = (W - rowWidth) / 2;

  for (let i = 0; i < 4; i++) {
    const x = starsStartX + i * (starSize + starGap) + starSize / 2;
    const y = starsY - starSize / 2 + starSize / 2;
    drawStar(
      ctx,
      x,
      y,
      starSize / 2,
      i < data.stars,
      COLORS.evidence,
      '#D4CFC8',
    );
  }

  // Rating label
  ctx.font = `bold 16px ${FONT_HEADING}`;
  ctx.fillStyle = COLORS.text;
  ctx.textBaseline = 'middle';
  ctx.fillText(
    ratingLabel,
    starsStartX + totalStarsWidth + 20,
    starsY - starSize / 2 + starSize / 2,
  );

  // --- Deduction grid ---
  const gridY = 165;
  const circleR = 14;
  const circleGap = 16;

  if (data.suspectOutcomes && data.suspectOutcomes.length > 0) {
    const gridWidth =
      data.suspectOutcomes.length * circleR * 2 +
      (data.suspectOutcomes.length - 1) * circleGap;
    let gridX = (W - gridWidth) / 2 + circleR;

    for (const outcome of data.suspectOutcomes) {
      ctx.beginPath();
      ctx.arc(gridX, gridY, circleR, 0, Math.PI * 2);

      if (outcome.status === 'accused') {
        ctx.fillStyle = COLORS.danger;
        ctx.fill();
        // X mark inside
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(gridX - 6, gridY - 6);
        ctx.lineTo(gridX + 6, gridY + 6);
        ctx.moveTo(gridX + 6, gridY - 6);
        ctx.lineTo(gridX - 6, gridY + 6);
        ctx.stroke();
      } else if (outcome.status === 'cleared') {
        ctx.fillStyle = '#D4CFC8';
        ctx.fill();
        // X mark inside
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gridX - 5, gridY - 5);
        ctx.lineTo(gridX + 5, gridY + 5);
        ctx.moveTo(gridX + 5, gridY - 5);
        ctx.lineTo(gridX - 5, gridY + 5);
        ctx.stroke();
      } else {
        ctx.fillStyle = COLORS.backgroundAlt;
        ctx.fill();
        ctx.strokeStyle = '#D4CFC8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      gridX += circleR * 2 + circleGap;
    }
  }

  // --- Stats row ---
  const statsY = 230;
  ctx.textBaseline = 'middle';

  // Clues used (filled/empty squares)
  const clueBoxSize = 14;
  const clueBoxGap = 4;
  const statsContent = `Clues`;
  ctx.font = `600 13px ${FONT_MONO}`;
  ctx.fillStyle = COLORS.text;
  const cluesLabelWidth = ctx.measureText(statsContent).width;
  const timeStr = formatTime(data.timeSeconds);
  const timeWidth = ctx.measureText(timeStr).width;
  const dividerWidth = ctx.measureText('  |  ').width;
  const clueSquaresWidth = 3 * clueBoxSize + 2 * clueBoxGap;
  const totalWidth =
    cluesLabelWidth + 8 + clueSquaresWidth + dividerWidth + timeWidth;
  let sx = (W - totalWidth) / 2;

  ctx.fillText(statsContent, sx, statsY);
  sx += cluesLabelWidth + 8;

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < data.cluesUsed ? COLORS.text : '#D4CFC8';
    ctx.fillRect(sx + i * (clueBoxSize + clueBoxGap), statsY - clueBoxSize / 2, clueBoxSize, clueBoxSize);
  }
  sx += clueSquaresWidth;

  ctx.fillStyle = COLORS.text;
  ctx.font = `600 13px ${FONT_MONO}`;
  ctx.fillText('  |  ', sx, statsY);
  sx += dividerWidth;

  ctx.fillText(timeStr, sx, statsY);

  // --- CTA ---
  const ctaY = 310;
  ctx.font = `italic 16px ${FONT_HEADING}`;
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText('Can you crack the case?', W / 2, ctaY);

  ctx.font = `bold 14px ${FONT_MONO}`;
  ctx.fillStyle = COLORS.action;
  ctx.fillText(GAME_URL, W / 2, ctaY + 30);

  // --- Bottom accent ---
  ctx.fillStyle = COLORS.action;
  ctx.fillRect(0, H - 4, W, 4);

  // Reset text align
  ctx.textAlign = 'start';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate image'));
    }, 'image/png');
  });
}
