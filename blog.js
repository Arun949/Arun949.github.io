/* Blog index. Entries live in articles.json; each has a `tracks` list
   containing 'journey', 'research', or both. The Write page keeps it up to date. */
const tracks = {
  journey: { label: 'My journey' },
  research: { label: 'My research' }
};

const articleList = document.querySelector('#article-list');
const emptyArticles = document.querySelector('#empty-articles');
const articleCount = document.querySelector('#article-count');
const listHeading = document.querySelector('#articles-heading');
const filterButtons = document.querySelectorAll('[data-filter]');
let articles = [];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const tracksOf = a => (Array.isArray(a.tracks) ? a.tracks : [a.track]).filter(t => tracks[t]);
const formatDate = date => {
  if (!date) return '';
  if (/^\d{4}$/.test(date)) return date;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
};
const countLabel = n => `${n} ${n === 1 ? 'entry' : 'entries'}`;

const render = filter => {
  const shown = filter === 'all' ? articles : articles.filter(a => tracksOf(a).includes(filter));
  articleList.innerHTML = '';
  listHeading.textContent = filter === 'all' ? 'Everything' : tracks[filter]?.label || 'Articles';
  articleCount.textContent = countLabel(shown.length);
  emptyArticles.hidden = shown.length > 0;

  shown.forEach(article => {
    const item = document.createElement(article.url ? 'a' : 'article');
    item.className = 'article-card';
    if (article.url) {
      item.href = article.url;
      if (article.external) { item.target = '_blank'; item.rel = 'noopener noreferrer'; }
    }
    const chips = tracksOf(article).map(t => `<span class="track-chip">${escapeHtml(tracks[t].label)}</span>`).join('');
    const meta = [formatDate(article.date), article.readTime].filter(Boolean).join(' · ');
    const cover = article.image
      ? `<img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt)}" width="1400" height="788" loading="lazy">`
      : `<div class="article-cover-fallback" aria-hidden="true"><span class="fallback-kind">${article.external ? 'Published paper' : escapeHtml(tracks[tracksOf(article)[0]]?.label || 'Notes')}</span><span class="fallback-title">${escapeHtml(article.category || article.title)}</span></div>`;
    item.innerHTML = cover
      + `<div class="article-card-content">`
      + `<p class="project-number">${chips}${escapeHtml(article.category || 'Notes')}</p>`
      + `<h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.summary)}</p>`
      + `<span>${escapeHtml(meta)}${article.external ? ' · External link' : ''}</span></div>`;
    articleList.appendChild(item);
  });

  filterButtons.forEach(control => {
    const on = control.dataset.filter === filter;
    if (control.tagName === 'BUTTON') control.setAttribute('aria-pressed', String(on));
    else if (on) control.setAttribute('aria-current', 'true');
    else control.removeAttribute('aria-current');
  });
  document.querySelectorAll('.track-card').forEach(card => card.classList.toggle('is-active', card.dataset.filter === filter));
};

const filterFromHash = () => {
  const hash = location.hash.replace('#', '');
  return tracks[hash] ? hash : 'all';
};

filterButtons.forEach(button => button.addEventListener('click', event => {
  event.preventDefault();
  const filter = button.dataset.filter;
  history.replaceState(null, '', filter === 'all' ? location.pathname : `#${filter}`);
  render(filter);
  if (button.classList.contains('track-card')) {
    document.querySelector('#articles').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}));
window.addEventListener('hashchange', () => render(filterFromHash()));

fetch('articles.json', { cache: 'no-cache' })
  .then(response => response.ok ? response.json() : [])
  .catch(() => [])
  .then(list => {
    articles = (Array.isArray(list) ? list : []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    document.querySelectorAll('[data-track-count]').forEach(node => {
      const n = articles.filter(a => tracksOf(a).includes(node.dataset.trackCount)).length;
      node.textContent = n ? countLabel(n) : 'First posts coming soon';
    });
    render(filterFromHash());
  });
