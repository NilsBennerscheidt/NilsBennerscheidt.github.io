/**
 * Buse Bedachungen — behaviour.
 *
 * No inline event handlers and no globals: every interaction is bound here so
 * the markup stays semantic and keyboard-operable.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- menu -- */

  const menuToggle = document.getElementById('menu-toggle');
  const menuContainer = document.getElementById('menu-container');

  // Matches the clip-path transition duration in main_input.css. The panel
  // stays in the DOM (and clickable) through the closing animation, then gets
  // `hidden` for real so it leaves the a11y tree and can't be tabbed into.
  const MENU_TRANSITION_MS = 350;
  let menuCloseTimer = null;

  function setMenu(open) {
    if (!menuToggle || !menuContainer) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    clearTimeout(menuCloseTimer);

    if (open) {
      menuContainer.hidden = false;
      // Force a reflow between un-hiding and adding .is-open — otherwise the
      // browser coalesces both changes into one frame and the panel just
      // appears with no roll-down transition.
      void menuContainer.offsetHeight;
      menuContainer.classList.add('is-open');
      return;
    }

    menuContainer.classList.remove('is-open');
    if (menuContainer.hidden || reduceMotion) {
      menuContainer.hidden = true;
    } else {
      menuCloseTimer = setTimeout(() => { menuContainer.hidden = true; }, MENU_TRANSITION_MS);
    }
  }

  if (menuToggle && menuContainer) {
    setMenu(false);
    menuToggle.addEventListener('click', () => {
      setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });
    // Follow the link first, then collapse.
    menuContainer.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuToggle.focus();
      }
    });
  }

  /* ----------------------------------------------------------- accordion -- */

  document.querySelectorAll('.accordion-toggle').forEach((button) => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;

    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
      const icon = button.querySelector('.accordion-icon');
      if (icon) icon.classList.toggle('rotate-180', !open);
    });
  });

  /* ------------------------------------------------------------- gallery -- */

  const dataEl = document.getElementById('gallery-data');
  const images = dataEl ? JSON.parse(dataEl.textContent) : [];

  function renderInto(picture, index, sizes) {
    const item = images[index];
    if (!item) return;
    picture.querySelectorAll('source').forEach((s) => s.remove());
    const img = picture.querySelector('img');

    item.sources.forEach((source) => {
      const el = document.createElement('source');
      el.type = source.type;
      el.srcset = source.srcset;
      el.sizes = sizes;
      picture.insertBefore(el, img);
    });

    img.src = item.src;
    img.srcset = item.srcset;
    img.sizes = sizes;
    img.width = item.width;
    img.height = item.height;
    img.alt = item.alt;
  }

  function makeViewer({ picture, status, sizes }) {
    let index = 0;
    return {
      show(next) {
        index = (next + images.length) % images.length;
        renderInto(picture, index, sizes);
        if (status) status.textContent = `Bild ${index + 1} von ${images.length}`;
      },
      next() {
        this.show(index + 1);
      },
      prev() {
        this.show(index - 1);
      },
    };
  }

  // Desktop: grid of buttons opening a modal dialog.
  const dialog = document.getElementById('lightbox');
  if (dialog && images.length) {
    const viewer = makeViewer({
      picture: dialog.querySelector('picture'),
      status: dialog.querySelector('[data-status]'),
      sizes: '90vw',
    });

    document.querySelectorAll('[data-gallery-index]').forEach((button) => {
      button.addEventListener('click', () => {
        viewer.show(Number(button.dataset.galleryIndex));
        // showModal() provides the focus trap, Esc handling, inert background
        // and focus restoration for free.
        dialog.showModal();
      });
    });

    const close = dialog.querySelector('[data-close]');
    const prev = dialog.querySelector('[data-prev]');
    const next = dialog.querySelector('[data-next]');
    if (close) close.addEventListener('click', () => dialog.close());
    if (prev) prev.addEventListener('click', () => viewer.prev());
    if (next) next.addEventListener('click', () => viewer.next());

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        viewer.prev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        viewer.next();
      }
    });

    // Clicking the backdrop closes; clicks inside the panel must not.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  // Mobile: an inline carousel, not a dialog.
  const carousel = document.getElementById('carousel');
  if (carousel && images.length) {
    const viewer = makeViewer({
      picture: carousel.querySelector('picture'),
      status: carousel.querySelector('[data-status]'),
      sizes: '100vw',
    });
    viewer.show(0);
    const prev = carousel.querySelector('[data-prev]');
    const next = carousel.querySelector('[data-next]');
    if (prev) prev.addEventListener('click', () => viewer.prev());
    if (next) next.addEventListener('click', () => viewer.next());
  }

  /* ------------------------------------------------------- contact glow -- */

  document.querySelectorAll('[data-contact-jump]').forEach((link) => {
    link.addEventListener('click', () => {
      if (reduceMotion) return;
      const targets = document.querySelectorAll('.addGlow');
      targets.forEach((el) => el.classList.add('is-glowing'));
      setTimeout(() => targets.forEach((el) => el.classList.remove('is-glowing')), 1500);
    });
  });

  /* ------------------------------------------------------ nav background -- */

  const navBar = document.querySelector('[data-nav-overlay]');
  if (navBar) {
    const syncNav = () => navBar.classList.toggle('is-scrolled', window.scrollY > 40);
    syncNav();
    window.addEventListener('scroll', syncNav, { passive: true });
  }

  /* ------------------------------------------------------- scroll reveal -- */

  // The start state lives in CSS (.js .reveal); this only flips sections on as
  // they come into view. Under reduced motion the CSS already neutralises the
  // start state, so the observer is skipped entirely.
  const revealTargets = document.querySelectorAll('.reveal');
  if (revealTargets.length && !reduceMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        });
      },
      // rootMargin rather than a threshold fraction: a section taller than the
      // viewport can never reach a 0.12 intersection ratio and would stay
      // hidden forever on small screens.
      { rootMargin: '0px 0px -12% 0px' }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-revealed'));
  }

  /* --------------------------------------------------------- storm alert -- */

  const stormBanner = document.getElementById('stormBanner');
  if (stormBanner) {
    const STORM_KMH = 75;
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=51.6595&longitude=7.3465' +
      '&daily=rain_sum,wind_speed_10m_max,wind_gusts_10m_max&timezone=Europe%2FBerlin' +
      '&past_days=14&forecast_days=3';

    fetch(url)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data) => {
        const over = (series) => (series || []).some((value) => value > STORM_KMH);
        if (over(data.daily && data.daily.wind_speed_10m_max) ||
            over(data.daily && data.daily.wind_gusts_10m_max)) {
          stormBanner.hidden = false;
        }
      })
      .catch(() => {
        /* Weather is a nice-to-have; failure must never break the page. */
      });
  }
})();
