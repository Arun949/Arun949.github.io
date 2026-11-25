const root = document.documentElement;
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }
};

/* Theme: follows the system until the visitor picks one. */
const themeToggle = document.querySelector('.theme-toggle');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
const syncThemeToggle = () => {
  if (!themeToggle) return;
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  themeToggle.querySelector('.theme-label').textContent = next === 'dark' ? 'Dark' : 'Light';
  themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
};
themeToggle?.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  storage.set('theme', next);
  syncThemeToggle();
});
darkQuery.addEventListener?.('change', syncThemeToggle);
syncThemeToggle();

/* Mobile menu */
const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const setMenu = open => {
  navLinks?.classList.toggle('open', open);
  menuButton?.setAttribute('aria-expanded', String(open));
  if (menuButton) menuButton.textContent = open ? 'Close' : 'Menu';
};
menuButton?.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
navLinks?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navLinks?.classList.contains('open')) {
    setMenu(false);
    menuButton?.focus();
  }
});

/* Highlight the section in view */
const sectionLinks = new Map();
navLinks?.querySelectorAll('a[href^="#"]').forEach(link => {
  const section = document.querySelector(link.getAttribute('href'));
  if (section) sectionLinks.set(section, link);
});
if (sectionLinks.size && 'IntersectionObserver' in window) {
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach(link => link.removeAttribute('aria-current'));
      sectionLinks.get(entry.target)?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sectionLinks.forEach((_, section) => navObserver.observe(section));
}

/* Gentle reveal on scroll (skipped for reduced motion) */
const revealItems = document.querySelectorAll('.reveal');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (revealItems.length && !reduceMotion && 'IntersectionObserver' in window) {
  root.classList.add('can-reveal');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealItems.forEach(item => revealObserver.observe(item));
}

/* Reading progress on articles */
const progress = document.querySelector('.reading-progress');
const article = document.querySelector('.post-body');
if (progress && article) {
  let ticking = false;
  const update = () => {
    const start = article.offsetTop;
    const span = Math.max(article.offsetHeight - window.innerHeight, 1);
    const ratio = Math.min(Math.max((window.scrollY - start + window.innerHeight * 0.3) / span, 0), 1);
    progress.style.transform = `scaleX(${ratio})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

/* Footer year */
document.querySelectorAll('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });

/* Copy email */
document.querySelectorAll('.copy-email').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.email);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Press Ctrl+C';
      const range = document.createRange();
      range.selectNodeContents(button.previousElementSibling);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  });
});

/* Contact form: opens the visitor's email app with the message filled in */
const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');
const formLoadedAt = Date.now();

contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const name = formData.get('name').trim();
  const email = formData.get('email').trim();
  const message = formData.get('message').trim();
  const honeypot = formData.get('company').trim();

  if (honeypot || Date.now() - formLoadedAt < 2500) {
    formStatus.textContent = 'Unable to send this message. Please use the email link below.';
    return;
  }

  const fields = [
    ['name', name.length >= 2],
    ['email', contactForm.querySelector('#email').validity.valid && email.length > 0],
    ['message', message.length >= 20]
  ];
  fields.forEach(([id, ok]) => contactForm.querySelector(`#${id}`).setAttribute('aria-invalid', String(!ok)));
  const firstInvalid = fields.find(([, ok]) => !ok);
  if (firstInvalid) {
    formStatus.textContent = 'Please enter your name, a valid email address, and a message of at least 20 characters.';
    contactForm.querySelector(`#${firstInvalid[0]}`).focus();
    return;
  }

  const subject = encodeURIComponent(`Portfolio message from ${name}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
  formStatus.textContent = 'Opening your email app with your message.';
  window.location.href = `mailto:aluruarunkumar19@gmail.com?subject=${subject}&body=${body}`;
});
