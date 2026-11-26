#!/usr/bin/env node
/* Rebuilds every editable post page from its source in posts/src/<slug>.json,
   using the same template as the Write page. Run after changing the template:

     node scripts/build-posts.js

   Keeps each post's date, cover and image size from articles.json. */
const fs = require('fs');
const path = require('path');
const core = require('../write-core.js');

const root = path.join(__dirname, '..');
const articlesPath = path.join(root, 'articles.json');
const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
let built = 0;

for (const entry of articles) {
  if (!entry.slug) continue;
  const srcPath = path.join(root, 'posts', 'src', `${entry.slug}.json`);
  if (!fs.existsSync(srcPath)) continue;
  const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

  entry.tracks = src.tracks;
  entry.title = core.titleCase(src.title);
  entry.titleMarkup = src.title;
  if (src.dek) entry.dek = src.dek; else delete entry.dek;
  if (src.linkUrl) { entry.linkUrl = src.linkUrl; entry.linkLabel = src.linkLabel || 'Open link'; } else { delete entry.linkUrl; delete entry.linkLabel; }
  entry.category = src.category;
  entry.summary = src.summary;
  if (entry.image) entry.imageAlt = src.imageAlt || entry.imageAlt;
  entry.readTime = core.readTime(src.body);
  entry.editable = true;

  const html = core.renderPostPage(entry, core.markdownToHtml(src.body));
  fs.writeFileSync(path.join(root, entry.url), html);
  built++;
  console.log(`built ${entry.url}`);
}

fs.writeFileSync(articlesPath, `${JSON.stringify(articles, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'feed.xml'), core.renderFeed(articles));
console.log(`${built} post(s) rebuilt; articles.json updated.`);
