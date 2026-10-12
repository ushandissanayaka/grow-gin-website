import { $, $$, finePointer, lerp, onTick, prefersReducedMotion } from './utils';

/** Trailing gold cursor ring with hover + label states (mouse users only). */
export function initCursor() {
  if (!finePointer || prefersReducedMotion) return;
  const ring = $('#cursor')!;
  const dot = $('#cursorDot')!;
  const label = $('.cursor__label', ring)!;
  document.documentElement.classList.add('has-cursor');

  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const pos = { ...mouse };

  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
  });

  document.addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement;
    const labelled = t.closest<HTMLElement>('[data-cursor]');
    const interactive = t.closest('a, button, input');
    ring.classList.toggle('is-label', !!labelled && !interactive);
    ring.classList.toggle('is-hover', !!interactive);
    label.textContent = labelled?.dataset.cursor ?? '';
  });

  document.addEventListener('pointerleave', () => (ring.style.opacity = '0'));
  document.addEventListener('pointerenter', () => (ring.style.opacity = '1'));

  onTick(() => {
    pos.x = lerp(pos.x, mouse.x, 0.16);
    pos.y = lerp(pos.y, mouse.y, 0.16);
    ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  });
}

/** Elements with [data-magnetic] lean toward the pointer. */
export function initMagnetic() {
  if (!finePointer || prefersReducedMotion) return;
  $$('[data-magnetic]').forEach((el) => {
    const strength = 0.3;
    el.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
}

/** Tilts gallery/slider cards in 3D under the pointer. */
export function initTilt(selector: string) {
  if (!finePointer || prefersReducedMotion) return;
  $$(selector).forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
}
