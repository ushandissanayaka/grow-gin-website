import { clamp, finePointer, lerp, onResize, onTick, prefersReducedMotion } from './utils';

/**
 * Tiny inertia scroll for mouse-wheel users. Native scrolling is kept for
 * touch, keyboard and scrollbar dragging, so nothing breaks.
 */
let target = window.scrollY;
let current = window.scrollY;
let animating = false;
let locked = false;
let max = 0;

const measure = () => {
  max = document.documentElement.scrollHeight - window.innerHeight;
};

export function lockScroll(state: boolean) {
  locked = state;
  document.body.classList.toggle('is-locked', state);
}

export function scrollToY(y: number) {
  measure();
  if (!finePointer || prefersReducedMotion) {
    window.scrollTo({ top: y, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    return;
  }
  current = window.scrollY;
  target = clamp(y, 0, max);
  animating = true;
}

export function initSmoothScroll() {
  measure();
  onResize(measure);
  new ResizeObserver(measure).observe(document.body);

  if (finePointer && !prefersReducedMotion) {
    document.documentElement.classList.add('has-smooth');

    window.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey || locked) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        const delta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
        if (!animating) current = window.scrollY;
        target = clamp(target + delta, 0, max);
        animating = true;
      },
      { passive: false },
    );

    window.addEventListener('scroll', () => {
      if (!animating) target = current = window.scrollY;
    });

    onTick(() => {
      if (!animating) return;
      current = lerp(current, target, 0.09);
      if (Math.abs(target - current) < 0.5) {
        current = target;
        animating = false;
      }
      window.scrollTo(0, current);
    });
  }

  // smooth anchor links
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href')!;
    const el = id === '#' ? null : document.querySelector(id);
    if (!el && id !== '#top') return;
    e.preventDefault();
    const y = id === '#top' ? 0 : (el as HTMLElement).getBoundingClientRect().top + window.scrollY;
    scrollToY(y);
  });
}
