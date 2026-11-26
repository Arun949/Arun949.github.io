#!/usr/bin/env node
/* Builds the French pages (fr/index.html, fr/cv.html) from the English ones,
   using the translations in i18n/fr.json:

     node scripts/build-fr.js

   Any English text that has no translation is listed as a warning, so you
   can add it to i18n/fr.json after changing the English pages. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { text, attrs } = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'fr.json'), 'utf8'));
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SITE = 'https://arun949.github.io';
const PAGES = [
  { src: 'index.html', out: 'fr/index.html', url: `${SITE}/`, frUrl: `${SITE}/fr/` },
  { src: 'cv.html', out: 'fr/cv.html', url: `${SITE}/cv.html`, frUrl: `${SITE}/fr/cv.html` }
];
const LOCAL_FR = new Set(['index.html', 'cv.html']);

for (const page of PAGES) {
  let html = fs.readFileSync(path.join(root, page.src), 'utf8');

  // 1) Text nodes: replace whole text segments between tags (longest first).
  const pairs = [...text].sort((a, b) => b[0].length - a[0].length);
  for (const [en, fr] of pairs) {
    html = html.replace(new RegExp(`>(\\s*)${escapeRe(en)}(\\s*)<`, 'g'), (_, a, b) => `>${a}${fr}${b}<`);
  }
  // 2) Attribute values.
  for (const [en, fr] of attrs) {
    html = html.split(`="${en}"`).join(`="${fr}"`);
  }

  // 3) Language, canonical and alternate links.
  html = html.replace('<html lang="en">', '<html lang="fr">')
    .replace(`<link rel="canonical" href="${page.url}">`, `<link rel="canonical" href="${page.frUrl}">`)
    .replace(`<meta property="og:url" content="${page.url}">`, `<meta property="og:url" content="${page.frUrl}">`)
    .replace(/<meta property="og:locale"[^>]*>\n?/, '')
    .replace('<meta property="og:type"', '<meta property="og:locale" content="fr_FR">\n  <meta property="og:type"');

  // 4) Language switch points back to English.
  html = html.replace(/<a class="lang-switch" href="fr\/(index|cv)\.html" hreflang="fr" lang="fr"[^>]*>FR<\/a>/g,
    (_, name) => `<a class="lang-switch" href="../${name}.html" hreflang="en" lang="en">EN</a>`);

  // 5) French CV PDF.
  html = html.split('href="assets/Arunkumar_Aluru_CV.pdf"').join('href="assets/Arunkumar_Aluru_CV_FR.pdf"');

  // 6) Relative links/assets now live one folder up, except pages that exist in French.
  html = html.replace(/(href|src)="([^"]+)"/g, (match, attr, value) => {
    if (/^(https?:|mailto:|tel:|#|\/|\.\.\/|data:)/.test(value)) return match;
    const file = value.split('#')[0].split('?')[0];
    if (LOCAL_FR.has(file)) return match;
    return `${attr}="../${value}"`;
  });

  fs.mkdirSync(path.join(root, 'fr'), { recursive: true });
  fs.writeFileSync(path.join(root, page.out), html);

  // Report English text left untranslated (ignores names, numbers and tech terms).
  const body = html.slice(html.indexOf('<body'));
  const leftovers = new Set();
  for (const m of body.replace(/<script[\s\S]*?<\/script>/g, '').matchAll(/>([^<>]{12,})</g)) {
    const t = m[1].trim();
    if (/\b(the|and|with|from|for|your|my|of)\b/i.test(t) && !/[àâçéèêëîïôûùüÿœ’]/i.test(t)) leftovers.add(t);
  }
  console.log(`built ${page.out}${leftovers.size ? ` (${leftovers.size} possibly untranslated):` : ''}`);
  leftovers.forEach(t => console.log(`  - ${t.slice(0, 110)}`));
}
