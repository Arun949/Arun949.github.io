/* Private writing page.
   Publishing creates one commit in the site's repository with:
     posts/<slug>.html       the finished article page
     posts/src/<slug>.json   the editable source (so the post can be edited later)
     assets/posts/<slug>.jpg the cover image, when one is added
     articles.json           the blog list
     sitemap.xml             search engine index
   The GitHub token never leaves this browser except in requests to api.github.com. */

const REPO = { owner: 'Arun949', name: 'Arun949.github.io', branch: 'main' };
const SITE = 'https://arun949.github.io';
const TRACKS = { journey: 'My journey', research: 'My research' };
const TOKEN_KEY = 'gh-token';
const DRAFT_KEY = 'write-draft';

const $ = selector => document.querySelector(selector);
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* unavailable */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* unavailable */ } }
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const slugify = text => String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const longDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date)
  ? new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
  : String(date || '');
const readTime = markdown => `${Math.max(1, Math.round((markdown.match(/\S+/g) || []).length / 220))} min read`;
const safeUrl = url => {
  const trimmed = String(url || '').trim();
  return /^(https?:\/\/|mailto:|\/|\.\.?\/|#)/i.test(trimmed) || /^[\w-]+(\/[\w.-]+)*\.(html|jpg|jpeg|png|webp|pdf)$/i.test(trimmed) ? trimmed : '#';
};

/* ------------------------------------------------------------------ */
/* Markdown → HTML (small, safe subset)                               */
/* ------------------------------------------------------------------ */
function inline(text) {
  const codes = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => { codes.push(code); return `\u0000${codes.length - 1}\u0000`; });
  out = out
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `<img src="${escapeHtml(safeUrl(url.replace(/&amp;/g, '&')))}" alt="${alt}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const href = safeUrl(url.replace(/&amp;/g, '&'));
      const external = /^https?:\/\//i.test(href) && !href.startsWith(SITE);
      return `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
}

function markdownToHtml(source) {
  const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let list = null;
  let leadDone = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = inline(paragraph.join(' '));
    html.push(leadDone ? `<p>${text}</p>` : `<p class="post-lead">${text}</p>`);
    leadDone = true;
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    html.push(`<${list.type}>${list.items.map(item => `<li>${inline(item)}</li>`).join('')}</${list.type}>`);
    list = null;
  };
  const flush = () => { flushParagraph(); flushList(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flush();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (!trimmed) { flush(); continue; }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1].length === 3 ? 'h3' : 'h2';
      html.push(`<${level}>${inline(heading[2])}</${level}>`);
      continue;
    }
    if (trimmed.startsWith('>')) {
      flush();
      const quote = [trimmed.replace(/^>\s?/, '')];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) { i++; quote.push(lines[i].trim().replace(/^>\s?/, '')); }
      html.push(`<p class="post-callout">${inline(quote.join(' '))}</p>`);
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const type = bullet ? 'ul' : 'ol';
      if (list && list.type !== type) flushList();
      if (!list) list = { type, items: [] };
      list.items.push((bullet || numbered)[1]);
      continue;
    }
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) {
      flush();
      html.push(`<figure class="post-figure">${inline(trimmed)}</figure>`);
      continue;
    }
    if (list) flushList();
    paragraph.push(trimmed);
  }
  flush();
  return html.join('\n        ');
}

/* ------------------------------------------------------------------ */
/* Article page template                                              */
/* ------------------------------------------------------------------ */
function renderPostPage(post, bodyHtml) {
  const url = `${SITE}/posts/${post.slug}.html`;
  const image = post.image ? `${SITE}/${post.image}` : `${SITE}/assets/social-preview.jpg?v=2`;
  const trackLinks = post.tracks.map(t => `<a href="../blog.html#${t}">${TRACKS[t]}</a>`).join(' · ');
  const eyebrow = [trackLinks, escapeHtml(post.category), escapeHtml(post.readTime)].filter(Boolean).join(' / ');
  const backTrack = post.tracks.length === 1 ? post.tracks[0] : null;
  const title = escapeHtml(post.title);
  const summary = escapeHtml(post.summary);
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    image,
    datePublished: post.date,
    ...(post.updated ? { dateModified: post.updated } : {}),
    author: { '@type': 'Person', name: 'Arunkumar Aluru', url: `${SITE}/` },
    mainEntityOfPage: url
  }, null, 2).replace(/</g, '\\u003c').split('\n').join('\n  ');
  const cover = post.image
    ? `\n      <figure class="post-cover"><img src="../${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" width="${post.imageWidth || 1400}" height="${post.imageHeight || 788}" fetchpriority="high"></figure>`
    : '';
  const version = '20261135';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${summary}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#e9e7df" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#111b1a" media="(prefers-color-scheme: dark)">
  <meta name="color-scheme" content="light dark">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title} | Arunkumar Aluru">
  <meta property="og:description" content="${summary}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="article:published_time" content="${post.date}">
  <meta property="article:author" content="Arunkumar Aluru">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <title>${title} | Arunkumar Aluru</title>
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css?v=${version}">
  <script type="application/ld+json">
  ${jsonLd}
  </script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="reading-progress" aria-hidden="true"></div>
  <header class="site-header"><nav class="nav container" aria-label="Primary navigation"><a class="wordmark" href="../index.html">Arunkumar<span>.</span></a><div class="nav-end"><a class="nav-back post-edit" href="../write.html?edit=${post.slug}" hidden>Edit</a><a class="nav-back" href="../blog.html">My Blog</a><button class="theme-toggle" type="button" aria-label="Switch colour theme"><span class="theme-label">Dark</span></button></div></nav></header>
  <main id="main-content">
    <article class="post container">
      <header class="post-header"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${summary ? `<p class="post-dek">${summary}</p>` : ''}<p class="post-meta">${longDate(post.date)}${post.updated && post.updated !== post.date ? ` · Updated ${longDate(post.updated)}` : ''} · Arunkumar Aluru</p></header>${cover}
      <div class="post-body">
        ${bodyHtml}
        <a class="post-back" href="../blog.html${backTrack ? `#${backTrack}` : ''}">← More from ${backTrack ? TRACKS[backTrack].toLowerCase() : 'my blog'}</a>
      </div>
    </article>
  </main>
  <footer class="footer container"><span>© <span data-year>2026</span> Arunkumar Aluru</span><a href="../blog.html">More articles</a></footer>
  <script src="../script.js?v=${version}"></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* GitHub API                                                         */
/* ------------------------------------------------------------------ */
const api = async (path, { method = 'GET', body, accept } = {}) => {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${store.get(TOKEN_KEY)}`,
      Accept: accept || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  if (!response.ok) {
    const error = new Error(`GitHub ${response.status}`);
    error.status = response.status;
    try { error.detail = (await response.json()).message; } catch { /* no body */ }
    throw error;
  }
  return accept === 'application/vnd.github.raw' ? response.text() : response.json();
};
const repoPath = `/repos/${REPO.owner}/${REPO.name}`;

const readFile = async path => {
  try {
    return await api(`${repoPath}/contents/${path}?ref=${REPO.branch}`, { accept: 'application/vnd.github.raw' });
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
};

/* files: [{ path, content }] for text, [{ path, base64 }] for binary, [{ path, remove: true }] to delete */
const commitFiles = async (files, message) => {
  const ref = await api(`${repoPath}/git/ref/heads/${REPO.branch}`);
  const parent = await api(`${repoPath}/git/commits/${ref.object.sha}`);
  const tree = [];
  for (const file of files) {
    if (file.remove) {
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
    } else if (file.base64) {
      const blob = await api(`${repoPath}/git/blobs`, { method: 'POST', body: { content: file.base64, encoding: 'base64' } });
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    } else {
      tree.push({ path: file.path, mode: '100644', type: 'blob', content: file.content });
    }
  }
  const newTree = await api(`${repoPath}/git/trees`, { method: 'POST', body: { base_tree: parent.tree.sha, tree } });
  const commit = await api(`${repoPath}/git/commits`, { method: 'POST', body: { message, tree: newTree.sha, parents: [ref.object.sha] } });
  await api(`${repoPath}/git/refs/heads/${REPO.branch}`, { method: 'PATCH', body: { sha: commit.sha } });
  return commit;
};

const friendlyError = error => {
  if (error.status === 401) return 'GitHub did not accept the token. It may have expired: disconnect and connect again with a new one.';
  if (error.status === 403 || error.status === 404) return 'The token cannot write to the website repository. Check that it has access to Arun949.github.io with Contents set to Read and write.';
  if (error.status === 409 || error.status === 422) return 'The website changed while you were publishing. Please press Publish again.';
  return `Something went wrong (${error.detail || error.message}). Your draft is still saved; please try again.`;
};

/* ------------------------------------------------------------------ */
/* Sitemap                                                            */
/* ------------------------------------------------------------------ */
const sitemapEntry = (slug, date) => `  <url>
    <loc>${SITE}/posts/${slug}.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
const removeFromSitemap = (xml, slug) => xml.replace(new RegExp(`  <url>\\s*<loc>${SITE.replace(/\./g, '\\.')}/posts/${slug}\\.html</loc>[\\s\\S]*?</url>\\n?`, 'g'), '');
const upsertSitemap = (xml, slug, date) => {
  const base = removeFromSitemap(xml || '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n', slug);
  return base.replace('</urlset>', `${sitemapEntry(slug, date)}</urlset>`);
};

/* ------------------------------------------------------------------ */
/* Cover image: resize in the browser to a 1400px-wide JPEG           */
/* ------------------------------------------------------------------ */
let cover = null; // { base64, dataUrl, width, height }
const prepareCover = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the image.'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('That file does not look like an image.'));
    img.onload = () => {
      const width = Math.min(1400, img.naturalWidth);
      const height = Math.round(img.naturalHeight * (width / img.naturalWidth));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      resolve({ dataUrl, base64: dataUrl.split(',')[1], width, height });
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* ------------------------------------------------------------------ */
/* Page state                                                         */
/* ------------------------------------------------------------------ */
const form = $('#post-form');
const fields = {
  title: $('#title'), category: $('#category'), slug: $('#slug'), summary: $('#summary'),
  coverAlt: $('#cover-alt'), body: $('#body'), cover: $('#cover')
};
let editing = null;      // the article entry being edited, or null for a new post
let slugTouched = false;
let articles = [];

const selectedTracks = () => [...form.querySelectorAll('input[name="tracks"]:checked')].map(input => input.value);
const setTracks = list => form.querySelectorAll('input[name="tracks"]').forEach(input => { input.checked = list.includes(input.value); });
const currentSlug = () => editing ? editing.slug : (slugify(fields.slug.value) || slugify(fields.title.value));

const updatePreview = () => {
  const tracksChosen = selectedTracks();
  $('#pv-eyebrow').textContent = [tracksChosen.map(t => TRACKS[t]).join(' · '), fields.category.value.trim(), readTime(fields.body.value)].filter(Boolean).join(' / ');
  $('#pv-title').textContent = fields.title.value.trim() || 'Your title';
  $('#pv-summary').textContent = fields.summary.value.trim();
  $('#pv-body').innerHTML = markdownToHtml(fields.body.value) || '<p class="writer-muted">Your post will appear here as you write.</p>';
  const coverSrc = cover?.dataUrl || (editing?.image ? editing.image : '');
  $('#pv-cover').hidden = !coverSrc;
  if (coverSrc) $('#pv-cover-img').src = coverSrc;
  $('#slug-preview').textContent = currentSlug() || '…';
};

const saveDraft = () => {
  store.set(DRAFT_KEY, JSON.stringify({
    editingSlug: editing?.slug || null,
    title: fields.title.value, category: fields.category.value, slug: fields.slug.value,
    summary: fields.summary.value, coverAlt: fields.coverAlt.value, body: fields.body.value,
    tracks: selectedTracks(), savedAt: Date.now()
  }));
  $('#autosave').textContent = `Draft saved in this browser at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
};

const fillForm = data => {
  fields.title.value = data.title || '';
  fields.category.value = data.category || '';
  fields.slug.value = data.slug || '';
  fields.summary.value = data.summary || '';
  fields.coverAlt.value = data.coverAlt ?? data.imageAlt ?? '';
  fields.body.value = data.body || '';
  setTracks(data.tracks?.length ? data.tracks : ['journey']);
  fields.cover.value = '';
  cover = null;
  slugTouched = Boolean(data.slug);
};

const setMode = entry => {
  editing = entry;
  fields.slug.readOnly = Boolean(entry);
  $('#mode-label').textContent = entry ? `Editing: ${entry.title}` : 'New post';
  $('#new-post').hidden = !entry;
  $('#publish').textContent = entry ? 'Update post' : 'Publish';
  $('#discard').textContent = entry ? 'Stop editing' : 'Discard draft';
};

const startNew = () => {
  setMode(null);
  fillForm({});
  store.remove(DRAFT_KEY);
  $('#publish-status').textContent = '';
  $('#autosave').textContent = 'Drafts save automatically in this browser.';
  updatePreview();
  history.replaceState(null, '', location.pathname);
};

/* ------------------------------------------------------------------ */
/* Posts list                                                         */
/* ------------------------------------------------------------------ */
const loadArticles = async () => {
  const text = await readFile('articles.json');
  articles = text ? JSON.parse(text) : [];
  return articles;
};

const renderPostList = () => {
  const list = $('#post-list');
  $('#posts-count').textContent = `(${articles.length})`;
  if (!articles.length) { list.innerHTML = '<li class="writer-muted">No posts yet.</li>'; return; }
  list.innerHTML = '';
  articles
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .forEach(article => {
      const li = document.createElement('li');
      const trackNames = (article.tracks || [article.track]).map(t => TRACKS[t]).filter(Boolean).join(' · ');
      li.innerHTML = `<div><strong>${escapeHtml(article.title)}</strong><span>${escapeHtml([trackNames, article.date].filter(Boolean).join(' · '))}</span></div>`;
      const actions = document.createElement('div');
      actions.className = 'writer-post-actions';
      if (article.slug && article.editable) {
        const edit = document.createElement('button');
        edit.type = 'button'; edit.textContent = 'Edit';
        edit.addEventListener('click', () => openForEdit(article.slug));
        actions.appendChild(edit);
      } else {
        const note = document.createElement('span');
        note.className = 'writer-muted';
        note.textContent = article.external ? 'External link' : 'Written before the editor';
        actions.appendChild(note);
      }
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Remove'; remove.className = 'writer-danger';
      remove.addEventListener('click', () => removePost(article));
      actions.appendChild(remove);
      li.appendChild(actions);
      list.appendChild(li);
    });
};

const refreshList = async () => {
  try {
    await loadArticles();
    renderPostList();
  } catch (error) {
    $('#post-list').innerHTML = `<li class="writer-muted">${escapeHtml(friendlyError(error))}</li>`;
  }
};

const openForEdit = async slug => {
  const status = $('#publish-status');
  status.textContent = 'Loading post…';
  try {
    if (!articles.length) await loadArticles();
    const entry = articles.find(a => a.slug === slug);
    const source = await readFile(`posts/src/${slug}.json`);
    if (!entry || !source) { status.textContent = 'This post was written before the editor existed, so it cannot be edited here yet.'; return; }
    setMode(entry);
    fillForm({ ...JSON.parse(source), slug });
    $('#posts-panel').open = false;
    status.textContent = '';
    history.replaceState(null, '', `?edit=${encodeURIComponent(slug)}`);
    updatePreview();
    saveDraft();
    window.scrollTo({ top: 0 });
  } catch (error) {
    status.textContent = friendlyError(error);
  }
};

const removePost = async article => {
  const name = `"${article.title}"`;
  if (!window.confirm(`Remove ${name} from your website? It will disappear from the blog within a minute or two. (It stays in the repository's history, so it can be recovered.)`)) return;
  const status = $('#publish-status');
  status.textContent = 'Removing…';
  try {
    const current = await loadArticles();
    const remaining = current.filter(a => a.url !== article.url);
    const files = [{ path: 'articles.json', content: `${JSON.stringify(remaining, null, 2)}\n` }];
    if (!article.external && article.url?.startsWith('posts/')) {
      const slug = article.url.replace(/^posts\//, '').replace(/\.html$/, '');
      files.push({ path: article.url, remove: true });
      if (article.editable) files.push({ path: `posts/src/${slug}.json`, remove: true });
      if (article.image?.startsWith('assets/posts/')) files.push({ path: article.image, remove: true });
      const sitemap = await readFile('sitemap.xml');
      if (sitemap) files.push({ path: 'sitemap.xml', content: removeFromSitemap(sitemap, slug) });
    }
    await commitFiles(files, `Remove post: ${article.title}`);
    articles = remaining;
    renderPostList();
    if (editing?.url === article.url) startNew();
    status.textContent = `Removed ${name}.`;
  } catch (error) {
    status.textContent = friendlyError(error);
  }
};

/* ------------------------------------------------------------------ */
/* Publish                                                            */
/* ------------------------------------------------------------------ */
const publish = async () => {
  const status = $('#publish-status');
  const title = fields.title.value.trim();
  const tracksChosen = selectedTracks();
  const body = fields.body.value.trim();
  const slug = currentSlug();

  const problems = [];
  if (!title) problems.push(['title', 'a title']);
  if (!tracksChosen.length) problems.push([null, 'at least one place to show it (My journey or My research)']);
  if (!body) problems.push(['body', 'some writing']);
  if (!slug) problems.push(['slug', 'a web address']);
  if (cover && !fields.coverAlt.value.trim()) problems.push(['coverAlt', 'a short description of the cover image']);
  if (problems.length) {
    status.textContent = `Please add ${problems.map(p => p[1]).join(', ')}.`;
    const first = problems.find(p => p[0]);
    if (first) fields[first[0]].focus();
    return;
  }

  const button = $('#publish');
  button.disabled = true;
  status.textContent = editing ? 'Updating…' : 'Publishing…';
  try {
    const current = await loadArticles();
    const existing = current.find(a => a.url === `posts/${slug}.html`);
    if (!editing && existing) {
      status.textContent = 'A post with this web address already exists. Change the web address and try again.';
      fields.slug.focus();
      return;
    }

    const date = editing?.date || today();
    const entry = {
      slug,
      tracks: tracksChosen,
      title,
      date,
      ...(editing ? { updated: today() } : {}),
      category: fields.category.value.trim(),
      summary: fields.summary.value.trim(),
      url: `posts/${slug}.html`,
      readTime: readTime(body),
      editable: true
    };
    const files = [];
    if (cover) {
      entry.image = `assets/posts/${slug}.jpg`;
      entry.imageAlt = fields.coverAlt.value.trim();
      entry.imageWidth = cover.width;
      entry.imageHeight = cover.height;
      files.push({ path: entry.image, base64: cover.base64 });
    } else if (editing?.image) {
      Object.assign(entry, { image: editing.image, imageAlt: fields.coverAlt.value.trim() || editing.imageAlt, imageWidth: editing.imageWidth, imageHeight: editing.imageHeight });
    }

    const updatedList = [entry, ...current.filter(a => a.url !== entry.url)]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const source = { title, tracks: tracksChosen, category: entry.category, summary: entry.summary, imageAlt: entry.imageAlt || '', body: fields.body.value };
    const sitemap = await readFile('sitemap.xml');

    files.push(
      { path: entry.url, content: renderPostPage(entry, markdownToHtml(body)) },
      { path: `posts/src/${slug}.json`, content: `${JSON.stringify(source, null, 2)}\n` },
      { path: 'articles.json', content: `${JSON.stringify(updatedList, null, 2)}\n` },
      { path: 'sitemap.xml', content: upsertSitemap(sitemap, slug, entry.updated || date) }
    );
    await commitFiles(files, `${editing ? 'Update' : 'Publish'} post: ${title}`);

    articles = updatedList;
    renderPostList();
    setMode(entry);
    cover = null;
    fields.cover.value = '';
    saveDraft();
    status.innerHTML = `${editing && entry.updated ? 'Updated' : 'Published'}! It will be live in about a minute at <a href="${SITE}/${entry.url}" target="_blank" rel="noopener noreferrer">${SITE.replace('https://', '')}/${entry.url}</a>.`;
    history.replaceState(null, '', `?edit=${encodeURIComponent(slug)}`);
  } catch (error) {
    status.textContent = friendlyError(error);
  } finally {
    button.disabled = false;
  }
};

/* ------------------------------------------------------------------ */
/* Formatting toolbar                                                 */
/* ------------------------------------------------------------------ */
const applyFormat = kind => {
  const area = fields.body;
  const { selectionStart: start, selectionEnd: end, value } = area;
  const selected = value.slice(start, end);
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const wrap = (before, after, placeholder) => {
    const text = selected || placeholder;
    area.setRangeText(`${before}${text}${after}`, start, end, 'end');
    area.setSelectionRange(start + before.length, start + before.length + text.length);
  };
  const prefixLines = make => {
    const block = value.slice(lineStart, end) || 'Item';
    const lines = block.split('\n').map((line, i) => make(line.replace(/^(#{1,3}\s|[-*]\s|\d+[.)]\s|>\s?)/, ''), i));
    area.setRangeText(lines.join('\n'), lineStart, end, 'end');
  };
  switch (kind) {
    case 'h2': prefixLines(line => `## ${line || 'Heading'}`); break;
    case 'h3': prefixLines(line => `### ${line || 'Subheading'}`); break;
    case 'bold': wrap('**', '**', 'bold text'); break;
    case 'italic': wrap('*', '*', 'italic text'); break;
    case 'code': selected.includes('\n') ? wrap('```\n', '\n```', 'code') : wrap('`', '`', 'code'); break;
    case 'link': {
      const url = window.prompt('Link address (https://…)');
      if (url) wrap('[', `](${url.trim()})`, 'link text');
      break;
    }
    case 'list': prefixLines(line => `- ${line}`); break;
    case 'numbered': prefixLines((line, i) => `${i + 1}. ${line}`); break;
    case 'quote': prefixLines(line => `> ${line}`); break;
    default: break;
  }
  area.focus();
  area.dispatchEvent(new Event('input', { bubbles: true }));
};

/* ------------------------------------------------------------------ */
/* Connect                                                            */
/* ------------------------------------------------------------------ */
const showWorkspace = async () => {
  $('#connect').hidden = true;
  $('#workspace').hidden = false;
  $('#account').hidden = false;
  try {
    const user = await api('/user');
    $('#account-name').textContent = `Connected as ${user.login}`;
  } catch {
    $('#account-name').textContent = 'Connected';
  }
  await refreshList();
  const editSlug = new URLSearchParams(location.search).get('edit');
  const draft = (() => { try { return JSON.parse(store.get(DRAFT_KEY) || 'null'); } catch { return null; } })();
  if (editSlug && (!draft || draft.editingSlug !== editSlug)) {
    await openForEdit(editSlug);
  } else if (draft) {
    const entry = draft.editingSlug ? articles.find(a => a.slug === draft.editingSlug) : null;
    setMode(entry || null);
    fillForm({ ...draft, slug: entry ? entry.slug : draft.slug });
    if (draft.savedAt) $('#autosave').textContent = `Draft restored from ${new Date(draft.savedAt).toLocaleString()}.`;
  } else {
    setMode(null);
  }
  updatePreview();
};

const showConnect = () => {
  $('#connect').hidden = false;
  $('#workspace').hidden = true;
  $('#account').hidden = true;
};

$('#connect-form').addEventListener('submit', async event => {
  event.preventDefault();
  const status = $('#connect-status');
  const token = $('#token').value.trim();
  if (!token) { status.textContent = 'Paste your token first.'; return; }
  status.textContent = 'Checking…';
  store.set(TOKEN_KEY, token);
  try {
    const repo = await api(repoPath);
    if (repo.permissions && !repo.permissions.push) throw Object.assign(new Error('read only'), { status: 403 });
    $('#token').value = '';
    status.textContent = '';
    await showWorkspace();
  } catch (error) {
    store.remove(TOKEN_KEY);
    status.textContent = friendlyError(error);
  }
});

$('#disconnect').addEventListener('click', () => {
  if (!window.confirm('Disconnect this browser? You will need to paste your token again to publish. Your current draft stays saved.')) return;
  store.remove(TOKEN_KEY);
  showConnect();
});

/* ------------------------------------------------------------------ */
/* Wire up the form                                                   */
/* ------------------------------------------------------------------ */
fields.title.addEventListener('input', () => {
  if (!slugTouched && !editing) fields.slug.value = slugify(fields.title.value);
});
fields.slug.addEventListener('input', () => { slugTouched = true; });
fields.slug.addEventListener('blur', () => { if (!editing) fields.slug.value = slugify(fields.slug.value); updatePreview(); });

let saveTimer;
form.addEventListener('input', () => {
  updatePreview();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 400);
});
form.addEventListener('change', updatePreview);

fields.cover.addEventListener('change', async () => {
  const file = fields.cover.files[0];
  if (!file) { cover = null; updatePreview(); return; }
  $('#cover-hint').textContent = 'Preparing image…';
  try {
    cover = await prepareCover(file);
    $('#cover-hint').textContent = `Ready: ${cover.width}×${cover.height}px. It is uploaded when you publish.`;
  } catch (error) {
    cover = null;
    fields.cover.value = '';
    $('#cover-hint').textContent = error.message;
  }
  updatePreview();
});

document.querySelectorAll('[data-md]').forEach(button => button.addEventListener('click', () => applyFormat(button.dataset.md)));
fields.body.addEventListener('keydown', event => {
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.key === 'b') { event.preventDefault(); applyFormat('bold'); }
  if (event.key === 'i') { event.preventDefault(); applyFormat('italic'); }
  if (event.key === 'k') { event.preventDefault(); applyFormat('link'); }
});

form.addEventListener('submit', event => { event.preventDefault(); publish(); });
$('#discard').addEventListener('click', () => {
  if (!editing && fields.body.value.trim() && !window.confirm('Discard this draft? This cannot be undone.')) return;
  startNew();
});
$('#new-post').addEventListener('click', startNew);

window.addEventListener('beforeunload', () => { if (!$('#workspace').hidden) saveDraft(); });

// Expose pure helpers for testing in the browser console.
window.__writer = { markdownToHtml, renderPostPage, slugify, upsertSitemap, removeFromSitemap, commitFiles };

if (store.get(TOKEN_KEY)) showWorkspace(); else showConnect();
