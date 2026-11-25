# Arunkumar Aluru — Portfolio

Personal site and blog of Arunkumar Aluru, AI Engineer Intern at Matvi Consulting and Master's student in Artificial Intelligence Systems at EPITA.

**Live:** [arun949.github.io](https://arun949.github.io)

## Stack

Plain HTML, CSS, and JavaScript served by GitHub Pages. There is no build step and no dependencies: edit a file, push to `main`, and Pages deploys it.

## Structure

```
index.html                 Portfolio: hero, profile, journey, toolkit, work, blog preview, research, contact
blog.html                  "Let's talk about" blog: My journey and My research tracks, rendered from articles.json
posts/*.html               One file per article
articles.json              Blog article list, written by the editor
write.html, write.js       Private editor that publishes posts to this repository
write-core.js              Markdown + article template, shared by the editor and scripts/build-posts.js
posts/src/*.json           Editable source for each post
blog.js                    Renders the blog index
script.js                  Theme toggle, mobile menu, active nav, scroll reveal, reading progress, contact form
styles.css                 Design tokens (light + dark) and all page styles
404.html                   Not-found page
assets/                    Portrait, blog covers, social preview image, favicon
sitemap.xml, robots.txt    Search engine hints
```

## Features

- Light and dark themes that follow the system setting, with a toggle that remembers the visitor's choice
- Section-aware navigation and a gentle scroll reveal that switches off under `prefers-reduced-motion`
- Accessible by default: skip link, visible focus rings, labelled form fields, keyboard-closable menu
- Structured data (`Person`, `BlogPosting`), Open Graph and Twitter cards, canonical URLs, sitemap
- Mail-app contact form with a honeypot and inline validation; no third-party services or cookies

## Writing a new post

Use the private editor at [`/write.html`](https://arun949.github.io/write.html) (it is not linked publicly; a **Write** button appears in the blog header once your browser is connected).

1. **Connect once per browser.** Create a fine-grained GitHub token with access to only this repository and **Contents: Read and write**, then paste it on the Write page. It is stored only in that browser's local storage. Revoke it any time at github.com/settings/personal-access-tokens.
2. **Write.** Title, which track(s) it belongs to (My journey, My research, or both), topic, summary, optional cover image, and the post in simple Markdown, with a live preview. Drafts autosave in the browser.
3. **Publish.** One commit adds `posts/<slug>.html`, `posts/src/<slug>.json` (the editable source), the cover in `assets/posts/`, and updates `articles.json` and `sitemap.xml`. GitHub Pages deploys it in about a minute.
4. **Edit or remove** posts from the "Your posts" list, or with the **Edit** link on any post written in the editor.

All posts, including the first two, have editable sources in `posts/src/`. If the article template in `write-core.js` changes, run `node scripts/build-posts.js` to rebuild every post page from its source.

## Local preview

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Design rules

See `AGENTS.md`. In short: editorial serif headings, mono labels, paper-and-teal palette, no gradients, drop shadows, neon, icon libraries, or animated arrows.
