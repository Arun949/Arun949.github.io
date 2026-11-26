const root = document.documentElement;
const SITE_ROOT = new URL('.', document.currentScript?.src || location.href);
const isFrench = root.lang === 'fr';
const tr = (en, fr) => (isFrench ? fr : en);
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
  themeToggle.querySelector('.theme-label').textContent = next === 'dark' ? tr('Dark', 'Sombre') : tr('Light', 'Clair');
  themeToggle.setAttribute('aria-label', next === 'dark' ? tr('Switch to dark theme', 'Passer au thème sombre') : tr('Switch to light theme', 'Passer au thème clair'));
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
  if (menuButton) menuButton.textContent = open ? tr('Close', 'Fermer') : 'Menu';
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

/* Back arrow: return to the previous page on this site, otherwise go to the page's parent */
document.querySelectorAll('[data-back]').forEach(link => link.addEventListener('click', event => {
  let cameFromSite = false;
  try { cameFromSite = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin; } catch { /* ignore */ }
  if (cameFromSite && history.length > 1) {
    event.preventDefault();
    history.back();
  }
}));

/* Writer tools: only shown in a browser connected on the Write page */
if (storage.get('gh-token')) {
  document.querySelectorAll('.write-link, .post-edit').forEach(node => { node.hidden = false; });
}

/* Homepage: feature the newest post from articles.json */
const latestPost = document.querySelector('[data-latest-post]');
if (latestPost) {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  fetch(new URL('articles.json', SITE_ROOT), { cache: 'no-cache' })
    .then(response => response.ok ? response.json() : [])
    .then(list => {
      const newest = (Array.isArray(list) ? list : [])
        .filter(a => a.url && !a.external)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
      if (!newest) return;
      const postTracks = Array.isArray(newest.tracks) ? newest.tracks : [newest.track];
      const label = document.querySelector('[data-latest-label]');
      if (label) {
        label.textContent = postTracks.length === 1
          ? (postTracks[0] === 'research' ? tr('Latest from my research', 'Dernier article : ma recherche') : tr('Latest from my journey', 'Dernier article : mon parcours'))
          : tr('Latest from my blog', 'Dernier article du blog');
      }
      const image = newest.image || 'assets/og-card.jpg';
      latestPost.innerHTML = `<img src="${new URL(image, SITE_ROOT).href}" alt="${esc(newest.imageAlt || '')}" width="1400" height="788" loading="lazy">`
        + `<div><p class="project-number">${esc([newest.category, newest.readTime].filter(Boolean).join(' · ').toUpperCase())}</p>`
        + `<h3>${esc(newest.title)}</h3><p>${esc(newest.summary)}</p>`
        + `<p class="text-links"><a href="${new URL(newest.url, SITE_ROOT).href}">${tr('Read article', 'Lire l’article')}</a><a href="${new URL('blog.html', SITE_ROOT).href}">${tr('View all posts', 'Tous les articles')}</a></p></div>`;
    })
    .catch(() => { /* keep the static fallback */ });
}

/* Footer year */
document.querySelectorAll('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });

/* Copy email */
document.querySelectorAll('.copy-email').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.email);
      button.textContent = tr('Copied', 'Copié');
    } catch {
      button.textContent = tr('Press Ctrl+C', 'Faites Ctrl+C');
      const range = document.createRange();
      range.selectNodeContents(button.previousElementSibling);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
    setTimeout(() => { button.textContent = tr('Copy', 'Copier'); }, 2000);
  });
});

/* Contact form.
   With a Web3Forms access key the message is delivered straight to the inbox.
   The key is public by design (it can only send mail to its owner's address).
   Without a key, or if sending fails, it falls back to opening the visitor's email app. */
const FORM_ACCESS_KEY = '8a3928f9-ee58-4734-b80b-27746d892e68';
const CONTACT_EMAIL = 'aluruarunkumar19@gmail.com';
const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');
const formLoadedAt = Date.now();

const setFormStatus = (text, state = '') => {
  formStatus.textContent = text;
  formStatus.dataset.state = state;
};
const openMailApp = (name, email, message) => {
  const subject = encodeURIComponent(`Portfolio message from ${name}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
};

contactForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const name = formData.get('name').trim();
  const email = formData.get('email').trim();
  const message = formData.get('message').trim();
  const honeypot = formData.get('company').trim();

  if (honeypot || Date.now() - formLoadedAt < 2500) {
    setFormStatus(tr('Unable to send this message. Please use the email link below.', 'Impossible d’envoyer ce message. Utilisez l’adresse e-mail ci-dessous.'), 'error');
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
    setFormStatus(tr('Please enter your name, a valid email address, and a message of at least 20 characters.', 'Indiquez votre nom, une adresse e-mail valide et un message d’au moins 20 caractères.'), 'error');
    contactForm.querySelector(`#${firstInvalid[0]}`).focus();
    return;
  }

  if (!FORM_ACCESS_KEY) {
    setFormStatus(tr('Opening your email app with your message.', 'Ouverture de votre messagerie avec votre message.'));
    openMailApp(name, email, message);
    return;
  }

  const button = contactForm.querySelector('button[type="submit"]');
  const label = button.textContent;
  button.disabled = true;
  button.textContent = tr('Sending…', 'Envoi…');
  setFormStatus('');
  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: FORM_ACCESS_KEY,
        subject: `Portfolio message from ${name}`,
        from_name: 'arun949.github.io',
        name,
        email,
        replyto: email,
        message,
        botcheck: ''
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) throw new Error(result.message || `HTTP ${response.status}`);
    contactForm.reset();
    contactForm.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    setFormStatus(tr(`Thank you, ${name.split(' ')[0]}! Your message has been sent. I'll reply to ${email} soon.`, `Merci, ${name.split(' ')[0]} ! Votre message a bien été envoyé. Je répondrai bientôt à ${email}.`), 'success');
  } catch {
    setFormStatus(tr('Sorry, the message could not be sent right now. Please try again, or email me directly using the address below.', 'Désolé, le message n’a pas pu être envoyé. Réessayez ou écrivez-moi directement à l’adresse ci-dessous.'), 'error');
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
});

/* ------------------------------------------------------------------ */
/* Shared helpers for the features below                              */
/* ------------------------------------------------------------------ */
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const loadJson = name => fetch(new URL(name, SITE_ROOT), { cache: 'no-cache' }).then(r => (r.ok ? r.json() : [])).catch(() => []);

/* Visitor statistics (GoatCounter: free, no cookies). Paste your code, e.g. 'arunkumar'. */
const GOATCOUNTER_CODE = '';
if (GOATCOUNTER_CODE && !/^(localhost|127\.)/.test(location.hostname)) {
  const counter = document.createElement('script');
  counter.async = true;
  counter.src = 'https://gc.zgo.at/count.js';
  counter.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  document.head.appendChild(counter);
}

/* Print buttons */
document.querySelectorAll('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));

/* Project filters on the homepage */
const filterBar = document.querySelector('.project-filters');
if (filterBar) {
  const items = document.querySelectorAll('#work [data-filters]');
  const count = filterBar.querySelector('.project-filter-count');
  const apply = key => {
    let shown = 0;
    items.forEach(item => {
      const match = key === 'all' || item.dataset.filters.split(' ').includes(key);
      item.hidden = !match;
      if (match) shown++;
    });
    filterBar.querySelectorAll('[data-project-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.projectFilter === key)));
    count.textContent = key === 'all' ? '' : tr(`${shown} project${shown === 1 ? '' : 's'}`, `${shown} projet${shown === 1 ? '' : 's'}`);
    const more = document.querySelector('.more-work');
    if (more) more.hidden = key !== 'all' && !more.querySelector('[data-filters]:not([hidden])');
  };
  filterBar.addEventListener('click', event => {
    const button = event.target.closest('[data-project-filter]');
    if (button) apply(button.dataset.projectFilter);
  });
}

/* Sticky "Get in touch" button on phones: shown after the hero, hidden near the contact form */
const stickyContact = document.querySelector('.sticky-contact');
const heroSection = document.querySelector('.hero');
const contactSection = document.querySelector('#contact');
if (stickyContact && heroSection && contactSection && 'IntersectionObserver' in window) {
  let pastHero = false;
  let atContact = false;
  const sync = () => { stickyContact.hidden = !(pastHero && !atContact); };
  new IntersectionObserver(([entry]) => { pastHero = !entry.isIntersecting; sync(); }).observe(heroSection);
  new IntersectionObserver(([entry]) => { atContact = entry.isIntersecting; sync(); }, { rootMargin: '0px 0px -20% 0px' }).observe(contactSection);
}

/* Articles: table of contents, share links, related posts */
const postBody = document.querySelector('.post-body');
if (postBody) {
  const headings = [...postBody.querySelectorAll(':scope > h2')];
  headings.forEach((h, i) => {
    if (!h.id) h.id = (h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section') + (document.getElementById(h.id) ? `-${i}` : '');
  });
  if (headings.length >= 4) {
    const toc = document.createElement('details');
    toc.className = 'post-toc';
    toc.open = window.matchMedia('(min-width: 900px)').matches;
    toc.innerHTML = `<summary>${tr('Contents', 'Sommaire')}</summary><ol>${headings.map(h => `<li><a href="#${h.id}">${escapeText(h.textContent)}</a></li>`).join('')}</ol>`;
    const lead = postBody.querySelector('.post-lead');
    (lead || postBody.firstElementChild).insertAdjacentElement(lead ? 'afterend' : 'beforebegin', toc);
  }

  const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const share = document.createElement('div');
  share.className = 'post-share';
  share.innerHTML = `<p>${tr('Share this', 'Partager')}</p>`
    + `<a class="button button-outline" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer">${tr('Share on LinkedIn', 'Partager sur LinkedIn')} ↗</a>`
    + `<button class="button button-outline" type="button" data-copy-link>${tr('Copy link', 'Copier le lien')}</button>`;
  const back = postBody.querySelector('.post-back, .project-next');
  postBody.insertBefore(share, back || null);
  share.querySelector('[data-copy-link]').addEventListener('click', async event => {
    try { await navigator.clipboard.writeText(canonical); event.target.textContent = tr('Link copied', 'Lien copié'); } catch { event.target.textContent = canonical; }
    setTimeout(() => { event.target.textContent = tr('Copy link', 'Copier le lien'); }, 2200);
  });

  if (/\/posts\//.test(location.pathname)) {
    loadJson('articles.json').then(list => {
      const here = location.pathname.split('/').pop();
      const current = list.find(a => a.url && a.url.endsWith(here));
      const tracks = current?.tracks || [];
      const related = list
        .filter(a => a !== current && a.url && !a.external)
        .map(a => ({ a, score: (a.tracks || []).filter(x => tracks.includes(x)).length * 10 + (a.date || '').localeCompare('2000') }))
        .sort((x, y) => y.score - x.score)
        .slice(0, 2)
        .map(x => x.a);
      if (!related.length) return;
      const section = document.createElement('section');
      section.className = 'related-posts';
      section.setAttribute('aria-labelledby', 'related-heading');
      section.innerHTML = `<h2 id="related-heading">${tr('Keep reading', 'À lire aussi')}</h2><div class="related-grid">${related.map(a => `<a class="related-card" href="${new URL(a.url, SITE_ROOT).href}"><span class="project-number">${escapeText(a.category || '')}</span><strong>${escapeText(a.title)}</strong><span>${escapeText(a.summary || '')}</span></a>`).join('')}</div>`;
      postBody.insertBefore(section, postBody.querySelector('.post-back') || null);
    });
  }
}

/* Site search: press / or Ctrl/Cmd + K, or use the search button in the header */
const navEnd = document.querySelector('.nav-end');
if (navEnd) {
  const searchButton = document.createElement('button');
  searchButton.type = 'button';
  searchButton.className = 'search-toggle';
  searchButton.setAttribute('aria-label', tr('Search the site', 'Rechercher sur le site'));
  searchButton.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  navEnd.insertBefore(searchButton, navEnd.querySelector('.theme-toggle'));

  const dialog = document.createElement('dialog');
  dialog.className = 'search-dialog';
  dialog.setAttribute('aria-label', tr('Search', 'Recherche'));
  dialog.innerHTML = `<form method="dialog" class="search-form" role="search"><label class="search-label" for="site-search">${tr('Search posts, projects and pages', 'Rechercher articles, projets et pages')}</label><input id="site-search" type="search" autocomplete="off" spellcheck="false" placeholder="${tr('Try “RAG”, “forecasting”, “AWS”…', 'Essayez « RAG », « prévision », « AWS »…')}"><button class="search-close" type="submit" aria-label="${tr('Close search', 'Fermer la recherche')}">Esc</button></form><ul class="search-results" role="listbox" aria-label="${tr('Results', 'Résultats')}"></ul><p class="search-hint">${tr('Use ↑ ↓ to move and Enter to open.', 'Utilisez ↑ ↓ pour naviguer et Entrée pour ouvrir.')}</p>`;
  document.body.appendChild(dialog);
  const input = dialog.querySelector('input');
  const results = dialog.querySelector('.search-results');
  let entries = null;
  let active = 0;

  const staticPages = [
    { title: tr('About', 'À propos'), kind: tr('Page', 'Page'), text: 'profile EPITA Matvi Consulting AI engineer', url: 'index.html#about' },
    { title: tr('Journey', 'Parcours'), kind: tr('Page', 'Page'), text: 'experience education timeline Teachnook Kalasalingam', url: 'index.html#journey' },
    { title: tr('Selected work', 'Projets'), kind: tr('Page', 'Page'), text: 'projects portfolio', url: 'index.html#work' },
    { title: tr('Contact', 'Contact'), kind: tr('Page', 'Page'), text: 'email message hire collaborate', url: 'index.html#contact' },
    { title: 'CV', kind: tr('Page', 'Page'), text: 'resume curriculum vitae download pdf skills experience', url: 'cv.html' },
    { title: tr('Blog', 'Blog'), kind: tr('Page', 'Page'), text: 'articles my journey my research', url: 'blog.html' }
  ];
  const ensureEntries = async () => {
    if (entries) return entries;
    const [posts, projects] = await Promise.all([loadJson('articles.json'), loadJson('projects.json')]);
    entries = [
      ...projects.map(p => ({ title: p.title, kind: tr('Case study', 'Étude de cas'), text: `${p.category} ${p.summary} ${(p.stack || []).join(' ')}`, url: p.url })),
      ...posts.map(p => ({ title: p.title, kind: tr('Article', 'Article'), text: `${p.category || ''} ${p.summary || ''}`, url: p.url, external: p.external })),
      ...staticPages
    ];
    return entries;
  };
  const render = list => {
    active = 0;
    results.innerHTML = list.length
      ? list.map((e, i) => `<li role="option" aria-selected="${i === 0}"><a href="${e.external ? escapeText(e.url) : new URL(e.url, SITE_ROOT).href}"${e.external ? ' target="_blank" rel="noopener noreferrer"' : ''}><span class="search-kind">${escapeText(e.kind)}</span><strong>${escapeText(e.title)}</strong></a></li>`).join('')
      : `<li class="search-empty">${tr('No results. Try another word.', 'Aucun résultat. Essayez un autre mot.')}</li>`;
  };
  const search = async () => {
    const all = await ensureEntries();
    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { render(all.slice(0, 8)); return; }
    const scored = all.map(e => {
      const hay = `${e.title} ${e.text}`.toLowerCase();
      const title = e.title.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (!hay.includes(term)) return null;
        score += title.includes(term) ? 3 : 1;
      }
      return { e, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).map(x => x.e);
    render(scored.slice(0, 10));
  };
  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    input.value = '';
    search();
    input.focus();
  };
  const move = step => {
    const options = [...results.querySelectorAll('[role="option"]')];
    if (!options.length) return;
    active = (active + step + options.length) % options.length;
    options.forEach((o, i) => o.setAttribute('aria-selected', String(i === active)));
    options[active].scrollIntoView({ block: 'nearest' });
  };
  searchButton.addEventListener('click', open);
  input.addEventListener('input', search);
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
    if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    if (event.key === 'Enter') {
      event.preventDefault();
      const link = results.querySelector('[aria-selected="true"] a');
      if (link) { dialog.close(); link.click(); }
    }
  });
  results.addEventListener('click', event => { if (event.target.closest('a')) dialog.close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.addEventListener('keydown', event => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
      event.preventDefault();
      open();
    }
  });
}
