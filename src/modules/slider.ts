import { $, $$, onResize } from './utils';

/** Card slider with arrows, drag/swipe and a progress bar. */
export function initSlider() {
  const root = $('#slider');
  if (!root) return;
  const track = $('.slider__track', root)!;
  const viewportEl = $('.slider__viewport', root)!;
  const cards = $$('.card', track);
  const prev = $<HTMLButtonElement>('.slider__arrow--prev', root)!;
  const next = $<HTMLButtonElement>('.slider__arrow--next', root)!;
  const bar = $('#sliderBar')!;
  cards.forEach((c, i) => c.style.setProperty('--i', String(i)));

  let index = 0;
  const gap = () => parseFloat(getComputedStyle(track).columnGap) || 16;
  const stepW = () => cards[0].getBoundingClientRect().width + gap();
  const perView = () => Math.max(1, Math.round(viewportEl.clientWidth / stepW()));
  const maxIndex = () => Math.max(0, cards.length - perView());

  const update = () => {
    index = Math.max(0, Math.min(index, maxIndex()));
    track.style.transform = `translate3d(${-index * stepW()}px,0,0)`;
    prev.disabled = index === 0;
    next.disabled = index === maxIndex();
    const pv = perView();
    bar.style.width = `${(pv / cards.length) * 100}%`;
    bar.style.transform = `translateX(${(index / pv) * 100}%)`;
  };

  prev.addEventListener('click', () => { index--; update(); });
  next.addEventListener('click', () => { index++; update(); });
  onResize(update);

  // drag / swipe
  let startX = 0;
  let dx = 0;
  let dragging = false;
  viewportEl.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging = true;
    startX = e.clientX;
    dx = 0;
    track.classList.add('is-dragging');
    viewportEl.setPointerCapture(e.pointerId);
  });
  viewportEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    const edge = (index === 0 && dx > 0) || (index === maxIndex() && dx < 0) ? 0.3 : 1;
    track.style.transform = `translate3d(${-index * stepW() + dx * edge}px,0,0)`;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    if (Math.abs(dx) > 50) index += dx < 0 ? 1 : -1;
    update();
  };
  viewportEl.addEventListener('pointerup', end);
  viewportEl.addEventListener('pointercancel', end);

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { index--; update(); }
    if (e.key === 'ArrowRight') { index++; update(); }
  });

  update();
}

/** Crossfading testimonials with autoplay. */
export function initReviews() {
  const wrap = $('#reviews');
  if (!wrap) return;
  const items = $$('.review', wrap);
  let i = 0;
  let timer = 0;
  const show = (n: number) => {
    items[i].classList.remove('is-active');
    items[i].classList.add('is-out');
    const old = items[i];
    setTimeout(() => old.classList.remove('is-out'), 900);
    i = (n + items.length) % items.length;
    items[i].classList.add('is-active');
    clearInterval(timer);
    timer = window.setInterval(() => show(i + 1), 7000);
  };
  wrap.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-rev]');
    if (b) show(i + Number(b.dataset.rev));
  });
  timer = window.setInterval(() => show(i + 1), 7000);
}
