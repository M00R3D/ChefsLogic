document.addEventListener('DOMContentLoaded', function () {
  const nav = document.querySelector('.topnav');
  if (!nav) return;
  const toggle = nav.querySelector('.nav-toggle');
  const menu = nav.querySelector('#primary-navigation');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', function () {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open');
  });

  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && nav.classList.contains('open')) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    }
  });
});