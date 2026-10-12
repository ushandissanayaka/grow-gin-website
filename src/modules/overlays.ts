import { $, $$, wait } from './utils';
import { lockScroll } from './smoothScroll';

/** Full-screen menu with circular reveal and hover image preview. */
export function initMenu() {
  const btn = $<HTMLButtonElement>('#menuBtn')!;
  const menu = $('#menu')!;
  const preview = $<HTMLImageElement>('.menu__preview img', menu)!;
  preview.removeAttribute('srcset'); // src is swapped on hover, srcset would win

  const setOpen = (open: boolean) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    lockScroll(open);
  };

  btn.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
    a.addEventListener('pointerenter', async () => {
      const src = a.dataset.img;
      if (!src || preview.getAttribute('src') === src) return;
      preview.classList.add('is-swap');
      await wait(250);
      preview.src = src;
      preview.classList.remove('is-swap');
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false);
  });
}

/** Product detail overlay that unfolds from the middle of the screen. */
export function initProduct() {
  const overlay = $('#product')!;
  const close = $<HTMLButtonElement>('.product__close', overlay)!;
  let opener: HTMLElement | null = null;

  const setOpen = (open: boolean) => {
    overlay.classList.toggle('is-open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    lockScroll(open);
    if (open) close.focus();
    else opener?.focus();
  };

  $$('[data-product]').forEach((b) =>
    b.addEventListener('click', () => {
      opener = b;
      setOpen(true);
    }),
  );
  close.addEventListener('click', () => setOpen(false));
  $$('[data-close-product]', overlay).forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) setOpen(false);
  });
}

/** "Next tastings" card slides in after a short delay; dismissible. */
export function initEvents() {
  const card = $('#events');
  if (!card) return;
  setTimeout(() => card.classList.add('is-visible'), 4000);
  $('.events__close', card)!.addEventListener('click', () => {
    card.classList.remove('is-visible');
    setTimeout(() => card.remove(), 1000);
  });
}

export function initNewsletter() {
  const form = $<HTMLFormElement>('#newsletter');
  if (!form) return;
  const msg = $('.newsletter__msg', form)!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.textContent = 'Thank you — welcome to the GROW circle.';
    form.reset();
  });
}
