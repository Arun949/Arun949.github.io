/* Shared by the Write page (browser) and scripts/build-posts.js (Node):
   Markdown → HTML, the article page template, and sitemap helpers. */

const SITE = 'https://arun949.github.io';
/* Bump this (and editor-version.json) whenever the editor or the article template changes. */
const EDITOR_VERSION = '20261165';
const TRACKS = { journey: 'My journey', research: 'My research' };

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
    if (list.type === 'ladder') {
      html.push(`<ol class="post-ladder">${list.items.map(item => {
        const [, label, text] = item.match(/^([^:]{1,30}):\s*(.*)$/) || [null, '', item];
        return `<li>${label ? `<span>${inline(label)}</span>` : ''}${inline(text)}</li>`;
      }).join('')}</ol>`);
    } else if (list.type === 'pipeline') {
      html.push(`<ol class="pipeline">${list.items.map((item, i) => {
        const [, label, text] = item.match(/^([^:]{1,40}):\s*(.*)$/) || [null, item, ''];
        return `<li><span class="pipeline-step">${String(i + 1).padStart(2, '0')}</span><strong>${inline(label)}</strong>${text ? `<span>${inline(text)}</span>` : ''}</li>`;
      }).join('')}</ol>`);
    } else if (list.type === 'metrics') {
      html.push(`<dl class="metric-grid">${list.items.map(item => {
        const [, value, label] = item.match(/^([^|]+)\|\s*(.*)$/) || [null, item, ''];
        return `<div><dt>${inline(value.trim())}</dt><dd>${inline(label)}</dd></div>`;
      }).join('')}</dl>`);
    } else if (list.type === 'check') {
      html.push(`<ul class="post-checklist">${list.items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`);
    } else {
      html.push(`<${list.type}>${list.items.map(item => `<li>${inline(item)}</li>`).join('')}</${list.type}>`);
    }
    list = null;
  };
  const addListItem = (type, text) => {
    flushParagraph();
    if (list && list.type !== type) flushList();
    if (!list) list = { type, items: [] };
    list.items.push(text);
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
    const stage = trimmed.match(/^=>\s+(.*)$/);
    const metric = trimmed.match(/^::\s+(.*\|.*)$/);
    if (stage) { addListItem('pipeline', stage[1]); continue; }
    if (metric) { addListItem('metrics', metric[1]); continue; }
    const step = trimmed.match(/^->\s+(.*)$/);
    const check = trimmed.match(/^[-*]\s+\[[ xX]?\]\s+(.*)$/);
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (step) { addListItem('ladder', step[1]); continue; }
    if (check) { addListItem('check', check[1]); continue; }
    if (bullet) { addListItem('ul', bullet[1]); continue; }
    if (numbered) { addListItem('ol', numbered[1]); continue; }
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
/* Titles may use *italic* for the green accent; cards and metadata use the plain text. */
const plainTitle = text => String(text || '').replace(/\*([^*]+)\*/g, '$1').replace(/\s+/g, ' ').trim();

/* Card titles use Title Case: capitalise each word except short joining words,
   keep acronyms (RAG, AI) as written, and drop a trailing full stop. */
const SMALL_WORDS = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'via', 'vs', 'per']);
const titleCase = text => plainTitle(text).replace(/\.$/, '').split(' ').map((word, i, words) => {
  const lower = word.toLowerCase();
  if (i > 0 && i < words.length - 1 && SMALL_WORDS.has(lower) && !/[:–—]$/.test(words[i - 1])) return lower;
  return word.replace(/^([^\p{L}\p{N}]*)(\p{L})/u, (_, pre, ch) => pre + ch.toUpperCase());
}).join(' ');

function renderPostPage(post, bodyHtml) {
  const url = `${SITE}/posts/${post.slug}.html`;
  /* Link previews need a still image; animated SVG covers have a JPG still in socialImage. */
  const image = post.socialImage ? `${SITE}/${post.socialImage}` : post.image && !post.image.endsWith('.svg') ? `${SITE}/${post.image}` : `${SITE}/assets/og-card.jpg`;
  const trackLinks = post.tracks.map(t => `<a href="../blog.html#${t}">${TRACKS[t]}</a>`).join(' · ');
  const eyebrow = [trackLinks, escapeHtml(post.category), escapeHtml(post.readTime)].filter(Boolean).join(' / ');
  const backTrack = post.tracks.length === 1 ? post.tracks[0] : null;
  const linkUrl = post.linkUrl ? safeUrl(post.linkUrl) : '';
  const linkExternal = /^https?:\/\//i.test(linkUrl) && !linkUrl.startsWith(SITE);
  const featuredLink = linkUrl
    ? `<p class="post-actions"><a class="button button-solid" href="${escapeHtml(linkUrl)}"${linkExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(post.linkLabel || 'Open link')}${linkExternal ? ' ↗' : ''}</a></p>`
    : '';
  const title = escapeHtml(plainTitle(post.title));
  const titleHtml = escapeHtml(post.titleMarkup || post.title).replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const summary = escapeHtml(post.summary);
  const dek = escapeHtml(post.dek || post.summary);
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: plainTitle(post.title),
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
  const version = EDITOR_VERSION;

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
  <meta property="og:site_name" content="Arunkumar Aluru">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title} | Arunkumar Aluru">
  <meta property="og:description" content="${summary}">
  <meta property="og:image" content="${escapeHtml(image)}">${post.image && post.imageAlt ? `
  <meta property="og:image:alt" content="${escapeHtml(post.imageAlt)}">` : ''}
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
  <header class="site-header"><nav class="nav container" aria-label="Primary navigation"><div class="nav-start"><a class="back-link" href="../blog.html${backTrack ? `#${backTrack}` : ''}" data-back aria-label="Go back"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M19 12H5M11 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a><a class="wordmark" href="../index.html">Arunkumar<span>.</span></a></div><div class="nav-end"><a class="nav-back post-edit" href="../write.html?edit=${post.slug}" hidden>Edit</a><a class="nav-back" href="../blog.html">My Blog</a><button class="theme-toggle" type="button" aria-label="Switch colour theme"><span class="theme-label">Dark</span></button></div></nav></header>
  <main id="main-content">
    <article class="post container">
      <header class="post-header"><p class="eyebrow">${eyebrow}</p><h1${plainTitle(post.title).length > 60 ? ' class="is-long"' : ''}>${titleHtml}</h1>${dek ? `<p class="post-dek">${dek}</p>` : ''}<p class="post-meta">${longDate(post.date)}${post.updated && post.updated !== post.date ? ` · Updated ${longDate(post.updated)}` : ''} · Arunkumar Aluru</p>${featuredLink}</header>${cover}
      <div class="post-body">
        ${bodyHtml}
        ${featuredLink ? featuredLink.replace('post-actions', 'post-actions post-actions-end') : ''}
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


/* RSS feed for the blog, regenerated whenever the article list changes. */
function renderFeed(articles) {
  const xml = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
  const toDate = d => {
    const date = /^\d{4}$/.test(String(d)) ? new Date(`${d}-01-01T12:00:00Z`) : new Date(`${d}T12:00:00Z`);
    return isNaN(date) ? new Date().toUTCString() : date.toUTCString();
  };
  const items = (articles || [])
    .filter(a => a.url && !a.external)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map(a => {
      const link = `${SITE}/${a.url}`;
      return `    <item>
      <title>${xml(plainTitle(a.title))}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>
      <pubDate>${toDate(a.date)}</pubDate>
      <description>${xml(a.summary)}</description>
${(a.tracks || []).map(tr => `      <category>${xml(TRACKS[tr] || tr)}</category>`).join('\n')}
    </item>`;
    }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Arunkumar Aluru: My Blog</title>
    <link>${SITE}/blog.html</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>My journey in AI engineering and the research I am working on.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
}

if (typeof module !== 'undefined') {
  module.exports = { SITE, EDITOR_VERSION, TRACKS, renderFeed, titleCase, escapeHtml, slugify, today, longDate, readTime, safeUrl, inline, markdownToHtml, renderPostPage, sitemapEntry, removeFromSitemap, upsertSitemap, plainTitle };
}
