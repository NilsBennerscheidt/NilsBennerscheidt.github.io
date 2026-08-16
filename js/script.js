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
  const menuNav = menuToggle ? menuToggle.closest('nav') : null;

  // Matches the clip-path transition duration in main_input.css. The panel
  // stays in the DOM (and clickable) through the closing animation, then gets
  // `hidden` for real so it leaves the a11y tree and can't be tabbed into.
  const MENU_TRANSITION_MS = 350;
  let menuCloseTimer = null;

  function setMenu(open) {
    if (!menuToggle || !menuContainer) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    clearTimeout(menuCloseTimer);
    // Stop the page behind the (now full-screen) panel from scrolling too.
    document.body.classList.toggle('overflow-hidden', open);

    if (open) {
      menuContainer.hidden = false;
      if (menuNav) menuNav.classList.add('menu-open');
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
      if (menuNav) menuNav.classList.remove('menu-open');
    } else {
      menuCloseTimer = setTimeout(() => {
        menuContainer.hidden = true;
        if (menuNav) menuNav.classList.remove('menu-open');
      }, MENU_TRANSITION_MS);
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

  // A panel's own × (e.g. the VELUX drawer) just delegates to its trigger
  // button rather than duplicating the open/close state — the trigger is
  // the single source of truth for aria-expanded and the chevron icon.
  document.querySelectorAll('[data-accordion-close]').forEach((closeBtn) => {
    const trigger = document.getElementById(closeBtn.getAttribute('data-accordion-close'));
    if (trigger) closeBtn.addEventListener('click', () => trigger.click());
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
      // Positive bottom margin (not a threshold fraction, and not negative):
      // it grows the intersection root past the actual viewport edge, so a
      // section starts revealing while it's still below the fold and has
      // finished its 250ms fade by the time it scrolls into view. With a
      // negative/zero margin the section only starts revealing once it's
      // already on screen, which read as the section's own background
      // (photo/dark band) sitting there inert for a beat before the content
      // suddenly popped in on top of it.
      { rootMargin: '0px 0px 20% 0px' }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-revealed'));
  }

  /* --------------------------------------------------------- storm alert -- */

  const stormBanner = document.getElementById('stormBanner');
  if (stormBanner) {
    // Bright Sky is a free JSON wrapper around the DWD's own official warning
    // feed (https://brightsky.dev) — no API key, resolves lat/lon to the
    // right Warncell for us. Data ultimately belongs to the Deutscher
    // Wetterdienst (Datenlizenz Deutschland – Namensnennung – Version 2.0);
    // the attribution line lives in the banner markup.
    const url = 'https://api.brightsky.dev/alerts?lat=51.6595&lon=7.3465';

    // Only "met" (meteorological, as opposed to health) alerts at severe/
    // extreme severity — DWD's Unwetterwarnung tiers 3–4 — and only ones
    // that actually describe wind, to keep the banner specific to storm
    // damage rather than firing on e.g. an extreme-heat or heavy-snow alert.
    const isStormAlert = (alert) =>
      alert.category === 'met' &&
      (alert.severity === 'severe' || alert.severity === 'extreme') &&
      /wind|sturm|orkan|böen/i.test(`${alert.event_en || ''} ${alert.event_de || ''}`);

    fetch(url)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data) => {
        if ((data.alerts || []).some(isStormAlert)) {
          stormBanner.hidden = false;
        }
      })
      .catch(() => {
        /* Weather is a nice-to-have; failure must never break the page. */
      });
  }
})();
