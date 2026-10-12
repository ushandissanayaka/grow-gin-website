export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ---------- one shared rAF loop ---------- */
type TickFn = (time: number, dt: number) => void;
const tickers = new Set<TickFn>();
let last = performance.now();

export const viewport = { w: window.innerWidth, h: window.innerHeight, scrollY: window.scrollY };

const loop = (time: number) => {
  const dt = Math.min(64, time - last);
  last = time;
  viewport.scrollY = window.scrollY;
  tickers.forEach((fn) => fn(time, dt));
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

export const onTick = (fn: TickFn) => {
  tickers.add(fn);
  return () => tickers.delete(fn);
};

const resizers = new Set<() => void>();
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    viewport.w = window.innerWidth;
    viewport.h = window.innerHeight;
    resizers.forEach((fn) => fn());
  }, 120);
});
export const onResize = (fn: () => void) => resizers.add(fn);

/* ---------- safe storage (may throw in private mode) ---------- */
export const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
};
