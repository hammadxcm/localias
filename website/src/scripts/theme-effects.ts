/**
 * Canvas-based ambient effect engine for per-theme visual effects.
 * Ported from portfolio's canvas.ts + matrix-rain.ts, simplified for slay website.
 */

const isTouchDevice =
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let w = 0;
let h = 0;
let frameId: number | null = null;
let initialized = false;

function resize(): void {
  if (!canvas) return;
  w = canvas.width = canvas.offsetWidth;
  h = canvas.height = canvas.offsetHeight;
}

/* ── Mote System ── */
interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  opacity: number;
  drift: number;
  speed: number;
  baseOpacity: number;
  glow: number;
  glowSpeed: number;
}

const MOTE_DEFAULTS: Pick<Mote, 'drift' | 'speed' | 'baseOpacity' | 'glow' | 'glowSpeed'> = {
  drift: 0,
  speed: 0,
  baseOpacity: 0,
  glow: 0,
  glowSpeed: 0,
};

function mote(
  base: Omit<Mote, 'drift' | 'speed' | 'baseOpacity' | 'glow' | 'glowSpeed'> &
    Partial<Pick<Mote, 'drift' | 'speed' | 'baseOpacity' | 'glow' | 'glowSpeed'>>,
): Mote {
  return { ...MOTE_DEFAULTS, ...base };
}

interface MoteEffectConfig {
  count: (w: number, h: number) => number;
  spawn: (w: number, h: number) => Mote;
  update: (m: Mote, w: number, h: number) => void;
  draw: (ctx: CanvasRenderingContext2D, m: Mote, color: string) => void;
}

let motes: Mote[] = [];

function initMotes(config: MoteEffectConfig): void {
  const baseCount = config.count(w, h);
  const count = isTouchDevice ? Math.floor(baseCount * 0.6) : baseCount;
  motes = [];
  for (let i = 0; i < count; i++) motes.push(config.spawn(w, h));
}

function drawMotes(config: MoteEffectConfig, color: string): void {
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  for (const m of motes) {
    config.update(m, w, h);
    config.draw(ctx, m, color);
  }
}

/* ── Shared Drawing Helpers ── */
function drawTrail(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  tailX: number,
  tailY: number,
  r: number,
  color: string,
  opacity: number,
): void {
  const grad = c.createLinearGradient(tailX, tailY, x, y);
  grad.addColorStop(0, `${color}0)`);
  grad.addColorStop(1, `${color}${opacity})`);
  c.beginPath();
  c.moveTo(tailX, tailY);
  c.lineTo(x, y);
  c.strokeStyle = grad;
  c.lineWidth = r;
  c.lineCap = 'round';
  c.stroke();
}

function drawGlowDot(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  opacity: number,
  glowRadius: number,
  glowMul = 0.12,
  coreMul = 0.5,
): void {
  c.beginPath();
  c.arc(x, y, glowRadius, 0, Math.PI * 2);
  c.fillStyle = `${color}${Math.max(0.02, opacity * glowMul)})`;
  c.fill();
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = `${color}${Math.max(0.1, opacity * coreMul)})`;
  c.fill();
}

/* ── Effect: Blood Rain ── */
const bloodRain: MoteEffectConfig = {
  count: (w, h) => Math.min(120, Math.floor((w * h) / 8000)),
  spawn: (w, h) => {
    const depth = Math.random();
    return mote({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.5 + depth * 2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: 2 + depth * 4,
      opacity: 0.15 + depth * 0.45,
      speed: 8 + depth * 25,
      drift: Math.random() * Math.PI * 2,
    });
  },
  update: (m, w, h) => {
    m.y += m.vy;
    m.x += m.vx + Math.sin(m.drift) * 0.15;
    m.drift += 0.01;
    if (m.y > h + m.speed) {
      m.y = -(m.speed + Math.random() * 40);
      m.x = Math.random() * w;
    }
    if (m.x > w) m.x = 0;
    if (m.x < 0) m.x = w;
  },
  draw: (ctx, m, color) => {
    const trailLen = m.speed;
    const grad = ctx.createLinearGradient(m.x, m.y - trailLen, m.x, m.y);
    grad.addColorStop(0, `${color}0)`);
    grad.addColorStop(0.6, `${color}${m.opacity * 0.5})`);
    grad.addColorStop(1, `${color}${m.opacity})`);
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - trailLen);
    ctx.lineTo(m.x, m.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = m.r;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `${color}${m.opacity * 0.8})`;
    ctx.fill();
  },
};

/* ── Effect: Matrix Rain ── */
let matrixDrops: number[] = [];
let matrixFrameCount = 0;
const matrixChars =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
const matrixFontSize = 14;

function initMatrixRain(): void {
  const columns = Math.floor(w / matrixFontSize);
  matrixDrops = [];
  for (let i = 0; i < columns; i++) {
    matrixDrops[i] = Math.random() * -100;
  }
  matrixFrameCount = 0;
}

function drawMatrixRain(color: string): void {
  if (!ctx) return;
  matrixFrameCount++;
  if (matrixFrameCount % 2 !== 0) return;

  ctx.fillStyle = 'rgba(10, 10, 10, 0.06)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.font = `${matrixFontSize}px monospace`;

  for (let i = 0; i < matrixDrops.length; i++) {
    if (Math.random() > 0.3) {
      const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
      ctx.fillText(char, i * matrixFontSize, matrixDrops[i] * matrixFontSize);
      if (matrixDrops[i] * matrixFontSize > h && Math.random() > 0.98) {
        matrixDrops[i] = 0;
      }
      matrixDrops[i]++;
    }
  }
}

/* ── Effect: Neon Sparks ── */
const neonSparks: MoteEffectConfig = {
  count: (w, h) => Math.min(70, Math.floor((w * h) / 14000)),
  spawn: (w, h) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 3;
    return mote({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      opacity: Math.random() * 0.5 + 0.5,
    });
  },
  update: (m, w, h) => {
    m.x += m.vx;
    m.y += m.vy;
    m.vx *= 0.96;
    m.vy *= 0.96;
    m.opacity -= 0.015;
    if (m.opacity <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 3;
      m.x = Math.random() * w;
      m.y = Math.random() * h;
      m.vx = Math.cos(angle) * speed;
      m.vy = Math.sin(angle) * speed;
      m.opacity = Math.random() * 0.5 + 0.5;
    }
  },
  draw: (ctx, m, color) => {
    drawTrail(ctx, m.x, m.y, m.x - m.vx * 4, m.y - m.vy * 4, m.r, color, m.opacity);
  },
};

/* ── Effect: Cosmic Dust ── */
const cosmicDust: MoteEffectConfig = {
  count: (w, h) => Math.min(60, Math.floor((w * h) / 16000)),
  spawn: (w, h) =>
    mote({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 3 + 1,
      vx: 0,
      vy: 0,
      opacity: 0,
      drift: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.003 + 0.001,
      baseOpacity: Math.random() * 0.3 + 0.2,
      glow: Math.random() * Math.PI * 2,
      glowSpeed: Math.random() * 0.02 + 0.01,
    }),
  update: (m, w, h) => {
    m.x += Math.cos(m.drift) * 0.3;
    m.y += Math.sin(m.drift) * 0.25;
    m.drift += m.speed;
    m.glow += m.glowSpeed;
    m.x += (Math.random() - 0.5) * 0.1;
    m.y += (Math.random() - 0.5) * 0.1;
    if (m.x < -10) m.x = w + 10;
    if (m.x > w + 10) m.x = -10;
    if (m.y < -10) m.y = h + 10;
    if (m.y > h + 10) m.y = -10;
  },
  draw: (ctx, m, color) => {
    const pulse = Math.sin(m.glow) * 0.2;
    const opacity = m.baseOpacity + pulse;
    drawGlowDot(ctx, m.x, m.y, m.r, color, opacity, m.r * 3);
  },
};

/* ── Effect: Retro Grid (Synthwave) ── */
let gridOffset = 0;

function drawRetroGrid(color: string): void {
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const horizon = h * 0.45;
  const gridLines = 20;
  const gridCols = 30;
  gridOffset = (gridOffset + 0.5) % (h / gridLines);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
  skyGrad.addColorStop(0, 'rgba(26, 16, 40, 0)');
  skyGrad.addColorStop(1, 'rgba(255, 46, 151, 0.05)');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizon);

  ctx.lineWidth = 1;
  for (let i = 0; i <= gridLines; i++) {
    const y = horizon + (i + gridOffset / (h / gridLines)) * ((h - horizon) / gridLines);
    const alpha = (i / gridLines) * 0.3;
    ctx.strokeStyle = `${color}${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const centerX = w / 2;
  for (let j = -gridCols / 2; j <= gridCols / 2; j++) {
    const spread = j / (gridCols / 2);
    ctx.strokeStyle = `${color}0.15)`;
    ctx.beginPath();
    ctx.moveTo(centerX + spread * w * 0.8, h);
    ctx.lineTo(centerX + spread * 20, horizon);
    ctx.stroke();
  }

  const sunGrad = ctx.createRadialGradient(centerX, horizon - 30, 10, centerX, horizon - 30, 80);
  sunGrad.addColorStop(0, 'rgba(249, 200, 14, 0.3)');
  sunGrad.addColorStop(0.5, 'rgba(255, 46, 151, 0.15)');
  sunGrad.addColorStop(1, 'rgba(255, 46, 151, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(centerX, horizon - 30, 80, 0, Math.PI * 2);
  ctx.fill();
}

/* ── Effect: Snowfall (Arctic) ── */
const snowfall: MoteEffectConfig = {
  count: (w, h) => Math.min(120, Math.floor((w * h) / 8000)),
  spawn: (w, h) =>
    mote({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 3 + 1,
      vy: Math.random() * 1 + 0.3,
      vx: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.6 + 0.2,
    }),
  update: (m, w, h) => {
    m.y += m.vy;
    m.x += m.vx + Math.sin(m.y * 0.01) * 0.3;
    if (m.y > h) {
      m.y = -5;
      m.x = Math.random() * w;
    }
    if (m.x > w) m.x = 0;
    if (m.x < 0) m.x = w;
  },
  draw: (ctx, m, color) => {
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fillStyle = `${color}${m.opacity})`;
    ctx.fill();
  },
};

/* ── Effect: Fireflies (Gruvbox) ── */
const fireflies: MoteEffectConfig = {
  count: (w, h) => Math.min(40, Math.floor((w * h) / 25000)),
  spawn: (w, h) =>
    mote({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 3 + 2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: 0,
      glow: Math.random() * Math.PI * 2,
      glowSpeed: Math.random() * 0.03 + 0.01,
    }),
  update: (m, w, h) => {
    m.x += m.vx;
    m.y += m.vy;
    m.glow += m.glowSpeed;
    if (m.x < 0 || m.x > w) m.vx *= -1;
    if (m.y < 0 || m.y > h) m.vy *= -1;
  },
  draw: (ctx, m, color) => {
    const intensity = (Math.sin(m.glow) + 1) / 2;
    const opacity = intensity * 0.6 + 0.1;
    const radius = m.r * (0.8 + intensity * 0.4);
    drawGlowDot(ctx, m.x, m.y, radius, color, opacity, radius * 3, 0.15, 1.0);
  },
};

/* ── Theme → Effect Map ── */
type EffectName =
  | 'bloodRain'
  | 'matrixRain'
  | 'neonSparks'
  | 'cosmicDust'
  | 'retroGrid'
  | 'snowfall'
  | 'fireflies';

interface ThemeEffectEntry {
  effect: EffectName | null;
  color: string;
}

const themeEffects: Record<string, ThemeEffectEntry> = {
  dark: { effect: null, color: '' },
  light: { effect: null, color: '' },
  blood: { effect: 'bloodRain', color: 'rgba(255, 0, 64, ' },
  synthwave: { effect: 'retroGrid', color: 'rgba(255, 46, 151, ' },
  matrix: { effect: 'matrixRain', color: 'rgba(0, 255, 65, 0.6)' },
  cyberpunk: { effect: 'neonSparks', color: 'rgba(0, 255, 255, ' },
  gruvbox: { effect: 'fireflies', color: 'rgba(250, 189, 47, ' },
  arctic: { effect: 'snowfall', color: 'rgba(3, 105, 161, ' },
  nebula: { effect: 'cosmicDust', color: 'rgba(224, 64, 251, ' },
};

/* ── Effect Registry (flat) ── */
const effectMap: Record<string, { init: () => void; draw: (color: string) => void }> = {
  retroGrid: { init: () => {}, draw: drawRetroGrid },
  matrixRain: { init: initMatrixRain, draw: drawMatrixRain },
  bloodRain: { init: () => initMotes(bloodRain), draw: (c) => drawMotes(bloodRain, c) },
  neonSparks: { init: () => initMotes(neonSparks), draw: (c) => drawMotes(neonSparks, c) },
  cosmicDust: { init: () => initMotes(cosmicDust), draw: (c) => drawMotes(cosmicDust, c) },
  snowfall: { init: () => initMotes(snowfall), draw: (c) => drawMotes(snowfall, c) },
  fireflies: { init: () => initMotes(fireflies), draw: (c) => drawMotes(fireflies, c) },
};

/* ── Lifecycle ── */
let currentEffect: EffectName | null = null;
let currentEntry: ThemeEffectEntry = themeEffects.dark;

function switchEffect(theme: string): void {
  currentEntry = themeEffects[theme] || themeEffects.dark;
  const newEffect = currentEntry.effect;

  if (newEffect !== currentEffect) {
    currentEffect = newEffect;
    // Clear canvas when switching away from matrix (it doesn't clear each frame)
    if (ctx) ctx.clearRect(0, 0, w, h);
    if (currentEffect && effectMap[currentEffect]) {
      effectMap[currentEffect].init();
    }
  }
}

function getCurrentTheme(): string {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function startLoop(): void {
  if (frameId !== null) return;

  function draw(): void {
    if (document.hidden) {
      frameId = null;
      return;
    }

    const theme = getCurrentTheme();
    const entry = themeEffects[theme] || themeEffects.dark;

    if (entry.effect !== currentEffect) switchEffect(theme);

    if (currentEffect && effectMap[currentEffect]) {
      effectMap[currentEffect].draw(currentEntry.color);
    }

    frameId = requestAnimationFrame(draw);
  }

  frameId = requestAnimationFrame(draw);
}

function onResize(): void {
  resize();
  if (currentEffect && effectMap[currentEffect]) {
    effectMap[currentEffect].init();
  }
}

function onVisibilityChange(): void {
  if (document.hidden) {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  } else {
    startLoop();
  }
}

export function initThemeEffects(): void {
  if (initialized) return;
  if (prefersReducedMotion) return;

  canvas = document.getElementById('theme-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  if (!ctx) return;

  initialized = true;
  resize();

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('themechange', () => switchEffect(getCurrentTheme()));

  switchEffect(getCurrentTheme());
  startLoop();
}
