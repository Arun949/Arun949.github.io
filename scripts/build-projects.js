#!/usr/bin/env node
/* Builds project case-study pages from projects/src/<slug>.json:

     node scripts/build-projects.js

   Writes projects/<slug>.html and projects.json (used for filters and search). */
const fs = require('fs');
const path = require('path');
const core = require('../write-core.js');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'projects', 'src');
const { SITE, escapeHtml, markdownToHtml, plainTitle, titleCase } = core;
const version = core.EDITOR_VERSION;

const projects = fs.readdirSync(srcDir)
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(srcDir, f), 'utf8')))
  .sort((a, b) => (a.order || 99) - (b.order || 99));

const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M19 12H5M11 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const linkButtons = (links, cls = '') => links.length
  ? `<p class="post-actions ${cls}">${links.map((l, i) => {
      const external = /^https?:\/\//.test(l.url);
      return `<a class="button ${i === 0 ? 'button-solid' : 'button-outline'}" href="${escapeHtml(l.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(l.label)}${external ? ' ↗' : ''}</a>`;
    }).join('')}</p>`
  : '';

function renderProject(p, index) {
  const url = `${SITE}/projects/${p.slug}.html`;
  const title = escapeHtml(titleCase(p.title));
  const titleHtml = escapeHtml(p.title).replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const image = p.image ? `${SITE}/${p.image}` : `${SITE}/assets/og-card.jpg`;
  const others = projects.filter(o => o.slug !== p.slug);
  const next = projects[(index + 1) % projects.length];
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: titleCase(p.title),
    description: p.summary,
    url,
    author: { '@type': 'Person', name: 'Arunkumar Aluru', url: `${SITE}/` },
    keywords: p.stack.join(', ')
  }, null, 2).replace(/</g, '\\u003c').split('\n').join('\n  ');
  const figure = p.image
    ? `\n      <figure class="post-cover project-media"><img src="../${escapeHtml(p.image)}" alt="${escapeHtml(p.imageAlt || '')}" width="${p.imageWidth || 1400}" height="${p.imageHeight || 788}" loading="lazy"></figure>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(p.summary)}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#e9e7df" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#111b1a" media="(prefers-color-scheme: dark)">
  <meta name="color-scheme" content="light dark">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Arunkumar Aluru">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title} | Case study | Arunkumar Aluru">
  <meta property="og:description" content="${escapeHtml(p.summary)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <title>${title} | Case study | Arunkumar Aluru</title>
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
  <header class="site-header"><nav class="nav container" aria-label="Primary navigation"><div class="nav-start"><a class="back-link" href="../index.html#work" data-back aria-label="Go back">${ARROW}</a><a class="wordmark" href="../index.html">Arunkumar<span>.</span></a></div><div class="nav-end"><a class="nav-back" href="../index.html#work">All work</a><button class="theme-toggle" type="button" aria-label="Switch colour theme"><span class="theme-label">Dark</span></button></div></nav></header>
  <main id="main-content">
    <article class="post project-page container">
      <header class="post-header"><p class="eyebrow">Case study / ${escapeHtml(p.category)}</p><h1>${titleHtml}</h1><p class="post-dek">${escapeHtml(p.dek)}</p><p class="project-team">${escapeHtml(p.team)}</p><ul class="tags">${p.stack.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>${linkButtons(p.links)}</header>${figure}
      <div class="post-body">
        ${markdownToHtml(p.body)}
        ${linkButtons(p.links, 'post-actions-end')}
        <nav class="project-next" aria-label="More projects">
          <p class="latest-label">Next case study</p>
          <a href="${next.slug}.html"><span>${escapeHtml(titleCase(next.title))}</span><small>${escapeHtml(next.category)}</small></a>
        </nav>
      </div>
    </article>
  </main>
  <footer class="footer container"><span>© <span data-year>2026</span> Arunkumar Aluru</span><span class="footer-links">${others.map(o => `<a href="${o.slug}.html">${escapeHtml(titleCase(o.title))}</a>`).join('')}</span></footer>
  <script src="../script.js?v=${version}"></script>
</body>
</html>
`;
}

projects.forEach((p, i) => {
  fs.writeFileSync(path.join(root, 'projects', `${p.slug}.html`), renderProject(p, i));
  console.log(`built projects/${p.slug}.html`);
});

const index = projects.map(p => ({
  slug: p.slug,
  title: titleCase(p.title),
  category: p.category,
  summary: p.summary,
  filters: p.filters,
  stack: p.stack,
  url: `projects/${p.slug}.html`
}));
fs.writeFileSync(path.join(root, 'projects.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(`${projects.length} project(s); projects.json updated.`);
