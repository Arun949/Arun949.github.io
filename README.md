# Arunkumar Aluru — Portfolio

Personal site and blog of Arunkumar Aluru, AI Engineer Intern at Matvi Consulting and Master's student in Artificial Intelligence Systems at EPITA.

**Live:** [arun949.github.io](https://arun949.github.io)

## Stack

Plain HTML, CSS, and JavaScript served by GitHub Pages. There is no build step and no dependencies: edit a file, push to `main`, and Pages deploys it.

## Structure

```
index.html                 Portfolio: hero, profile, journey, toolkit, work, blog preview, research, contact
blog.html                  Blog index, rendered from articles.js
posts/*.html               One file per article
articles.js                Blog article list (title, date, summary, cover)
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

1. Copy `posts/building-rag-systems.html` to `posts/<slug>.html` and replace the content, metadata, and JSON-LD.
2. Add a cover image to `assets/` (1400×788 works well).
3. Add an entry to `articles.js`.
4. Add the URL to `sitemap.xml`.
5. Optionally feature it in the "My Blog" section of `index.html`.

## Local preview

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Design rules

See `AGENTS.md`. In short: editorial serif headings, mono labels, paper-and-teal palette, no gradients, drop shadows, neon, icon libraries, or animated arrows.
