(() => {
  'use strict';

  // Accessible accordion: one panel open at a time.
  document.querySelectorAll('[data-accordion]').forEach((accordion) => {
    const items = [...accordion.querySelectorAll('.accordion__item')];

    items.forEach((item) => {
      const trigger = item.querySelector('.accordion__trigger');
      if (!trigger) return;

      trigger.addEventListener('click', () => {
        const shouldOpen = !item.classList.contains('is-open');

        items.forEach((otherItem) => {
          const otherTrigger = otherItem.querySelector('.accordion__trigger');
          otherItem.classList.remove('is-open');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        });

        if (shouldOpen) {
          item.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });

  // Scroll reveal. Sections animate in once when they first enter the
  // viewport, then stay visible — this avoids the flicker that toggling
  // the class on/off causes when scrolling back upward.
  const revealElements = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -8% 0px'
  });

  revealElements.forEach((element) => observer.observe(element));
})();
