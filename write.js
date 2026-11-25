/* Private writing page.
   Publishing creates one commit in the site's repository with:
     posts/<slug>.html       the finished article page
     posts/src/<slug>.json   the editable source (so the post can be edited later)
     assets/posts/<slug>.jpg the cover image, when one is added
     articles.json           the blog list
     sitemap.xml             search engine index
   The GitHub token never leaves this browser except in requests to api.github.com. */

const REPO = { owner: 'Arun949', name: 'Arun949.github.io', branch: 'main' };
const TOKEN_KEY = 'gh-token';
const DRAFT_KEY = 'write-draft';

const $ = selector => document.querySelector(selector);
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* unavailable */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* unavailable */ } }
};

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
  title: $('#title'), category: $('#category'), slug: $('#slug'), summary: $('#summary'), dek: $('#dek'),
  coverAlt: $('#cover-alt'), body: $('#body'), cover: $('#cover')
};
let editing = null;      // the article entry being edited, or null for a new post
let slugTouched = false;
let articles = [];

const selectedTracks = () => [...form.querySelectorAll('input[name="tracks"]:checked')].map(input => input.value);
const setTracks = list => form.querySelectorAll('input[name="tracks"]').forEach(input => { input.checked = list.includes(input.value); });
const currentSlug = () => editing ? editing.slug : (slugify(fields.slug.value) || slugify(plainTitle(fields.title.value)));

const updatePreview = () => {
  const tracksChosen = selectedTracks();
  $('#pv-eyebrow').textContent = [tracksChosen.map(t => TRACKS[t]).join(' · '), fields.category.value.trim(), readTime(fields.body.value)].filter(Boolean).join(' / ');
  $('#pv-title').innerHTML = escapeHtml(fields.title.value.trim() || 'Your title').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  $('#pv-summary').textContent = fields.dek.value.trim() || fields.summary.value.trim();
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
    summary: fields.summary.value, dek: fields.dek.value, coverAlt: fields.coverAlt.value, body: fields.body.value,
    tracks: selectedTracks(), savedAt: Date.now()
  }));
  $('#autosave').textContent = `Draft saved in this browser at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
};

const fillForm = data => {
  fields.title.value = data.title || '';
  fields.category.value = data.category || '';
  fields.slug.value = data.slug || '';
  fields.summary.value = data.summary || '';
  fields.dek.value = data.dek || '';
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
      title: titleCase(title),
      titleMarkup: title,
      ...(fields.dek.value.trim() ? { dek: fields.dek.value.trim() } : {}),
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
    const source = { title, tracks: tracksChosen, category: entry.category, summary: entry.summary, dek: fields.dek.value.trim(), imageAlt: entry.imageAlt || '', body: fields.body.value };
    const sitemap = await readFile('sitemap.xml');

    files.push(
      { path: entry.url, content: renderPostPage(entry, markdownToHtml(body)) },
      { path: `posts/src/${slug}.json`, content: `${JSON.stringify(source, null, 2)}\n` },
      { path: 'articles.json', content: `${JSON.stringify(updatedList, null, 2)}\n` },
      { path: 'sitemap.xml', content: upsertSitemap(sitemap, slug, entry.updated || date) }
    );
    await commitFiles(files, `${editing ? 'Update' : 'Publish'} post: ${titleCase(title)}`);

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
    const lines = block.split('\n').map((line, i) => make(line.replace(/^(#{1,3}\s|->\s|[-*]\s+\[[ xX]?\]\s|[-*]\s|\d+[.)]\s|>\s?)/, ''), i));
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
    case 'check': prefixLines(line => `- [ ] ${line}`); break;
    case 'steps': prefixLines(line => `-> ${line.includes(':') ? line : `Step: ${line}`}`); break;
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
  if (!slugTouched && !editing) fields.slug.value = slugify(plainTitle(fields.title.value));
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
