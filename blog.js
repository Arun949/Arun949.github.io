const tracks = window.blogTracks || {};
const articles = (Array.isArray(window.blogArticles) ? window.blogArticles : [])
  .slice()
  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

const articleList = document.querySelector('#article-list');
const emptyArticles = document.querySelector('#empty-articles');
const articleCount = document.querySelector('#article-count');
const listHeading = document.querySelector('#articles-heading');
const filterButtons = document.querySelectorAll('[data-filter]');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const formatDate = date => {
  if (!date) return '';
  if (/^\d{4}$/.test(date)) return date;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
};
const countLabel = n => `${n} ${n === 1 ? 'entry' : 'entries'}`;

// Fill in the counts on the track cards
document.querySelectorAll('[data-track-count]').forEach(node => {
  const n = articles.filter(a => a.track === node.dataset.trackCount).length;
  node.textContent = n ? countLabel(n) : 'First posts coming soon';
});

const render = filter => {
  const shown = filter === 'all' ? articles : articles.filter(a => a.track === filter);
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
    const trackLabel = tracks[article.track]?.label;
    const meta = [formatDate(article.date), article.readTime].filter(Boolean).join(' · ');
    item.innerHTML = `${article.image ? `<img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt)}" width="1400" height="788" loading="lazy">` : ''}`
      + `<div class="article-card-content">`
      + `<p class="project-number">${trackLabel ? `<span class="track-chip">${escapeHtml(trackLabel)}</span>` : ''}${escapeHtml(article.category || 'Notes')}</p>`
      + `<h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.summary)}</p>`
      + `<span>${escapeHtml(meta)}${article.external ? ' · External link' : ''}</span></div>`;
    articleList.appendChild(item);
  });

  filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
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

render(filterFromHash());
