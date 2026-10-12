import './styles/main.css';
import { $ } from './modules/utils';
import { initSplitText } from './modules/splitText';
import { initTheme } from './modules/theme';
import { initSmoothScroll } from './modules/smoothScroll';
import { ageGate, runLoader } from './modules/loader';
import { heroCritical, initHero } from './modules/hero';
import { initReveal } from './modules/reveal';
import { initCursor, initMagnetic, initTilt } from './modules/pointer';
import {
  initBotanicals,
  initHeader,
  initHorizontalGallery,
  initMarquee,
  initParallax,
  initScrubText,
} from './modules/scrollFx';
import { initReviews, initSlider } from './modules/slider';
import { initEvents, initMenu, initNewsletter, initProduct } from './modules/overlays';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
$('#year')!.textContent = String(new Date().getFullYear());

initTheme();
initSplitText();
const hero = initHero();
initSmoothScroll();
initHeader();
initCursor();
initMagnetic();
initTilt('.hgallery__track figure');
initParallax();
initScrubText();
initMarquee();
initHorizontalGallery();
initBotanicals();
initSlider();
initReviews();
initMenu();
initProduct();
initNewsletter();

(async () => {
  await runLoader(heroCritical());
  await ageGate();
  hero.start();
  initReveal();
  initEvents();
})();
