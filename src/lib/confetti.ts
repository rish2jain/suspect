// Lightweight canvas confetti burst - no external dependencies
// Uses the Cozy Noir palette for on-brand celebration

const COLORS = ['#C4882B', '#1A6B5A', '#9B3B3B', '#5B8C5A', '#6B7D8D', '#FAF8F5'];
const PARTICLE_COUNT = 80;
const GRAVITY = 0.3;
const DECAY = 0.012;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  w: number;
  h: number;
  rotation: number;
  rotSpeed: number;
  life: number;
}

export function fireConfetti(): void {
  // Respect reduced motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const cx = canvas.width / 2;
  const cy = canvas.height * 0.35;

  const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: cx,
    y: cy,
    vx: (Math.random() - 0.5) * 16,
    vy: Math.random() * -14 - 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    w: Math.random() * 8 + 4,
    h: Math.random() * 4 + 2,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.3,
    life: 1,
  }));

  let frame: number;

  function animate() {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;
      p.life -= DECAY;

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.globalAlpha = Math.max(0, p.life);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx!.restore();
    }

    if (alive) {
      frame = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(frame);
      canvas.remove();
    }
  }

  frame = requestAnimationFrame(animate);
}
