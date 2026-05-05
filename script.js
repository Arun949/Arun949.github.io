/* ============================================================
   LENIS SMOOTH SCROLL  (must run before anything else)
   ============================================================ */
let lenis = null;

function initLenis() {
    if (typeof Lenis === 'undefined') return;          // CDN not loaded

    lenis = new Lenis({
        duration      : 1.25,
        easing        : (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel   : true,
        smoothTouch   : false,
        touchMultiplier: 2,
        infinite      : false,
    });

    // Run Lenis on every animation frame
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    // Let existing scroll-event listeners still fire
    lenis.on('scroll', () => {
        if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    });
}

// Fallback for when CDN fails (rare)
function scrollTo(y) {
    if (lenis) { lenis.scrollTo(y, { duration: 1.2 }); }
    else       { window.scrollTo({ top: y, behavior: 'smooth' }); }
}

/* ============================================================
   PRELOADER
   ============================================================ */
(function () {
    const pl = document.createElement('div');
    pl.className = 'preloader';
    pl.innerHTML = `
        <div class="preloader-logo">AA</div>
        <div class="preloader-line"></div>
        <div class="preloader-tagline">AI &amp; ML Engineer</div>
        <div class="preloader-dots">
            <div class="preloader-dot"></div>
            <div class="preloader-dot"></div>
            <div class="preloader-dot"></div>
        </div>`;
    document.body.prepend(pl);

    // Init Lenis after DOM is fully painted
    window.addEventListener('load', () => {
        initLenis();
        setTimeout(() => {
            pl.classList.add('fade-out');
            document.body.classList.add('page-loaded');
            setTimeout(() => pl.remove(), 950);
        }, 2200);
    });
})();

/* ============================================================
   NEURAL NETWORK CANVAS  (fps-capped, pauses when tab hidden)
   ============================================================ */
(function () {
    const canvas = document.createElement('canvas');
    canvas.id = 'neural-canvas';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');

    let w = 0, h = 0;
    function resize() { w = canvas.width = innerWidth; h = canvas.height = innerHeight; }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const N = 48, DIST = 170;
    let mx = -9999, my = -9999, paused = false;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('visibilitychange', () => { paused = document.hidden; });

    class Node {
        constructor() {
            this.x  = Math.random() * w;
            this.y  = Math.random() * h;
            this.vx = (Math.random() - .5) * .42;
            this.vy = (Math.random() - .5) * .42;
            this.r  = Math.random() * 1.8 + 0.8;
            this.ph = Math.random() * Math.PI * 2;
            this.sp = Math.random() * .016 + .007;
            const p = Math.random();
            this.rgb = p < .45 ? '139,92,246' : p < .75 ? '236,72,153' : '6,182,212';
        }
        step() {
            this.x += this.vx; this.y += this.vy; this.ph += this.sp;
            if (this.x < 0 || this.x > w) this.vx *= -1;
            if (this.y < 0 || this.y > h) this.vy *= -1;
        }
        draw() {
            const a = .3 + Math.sin(this.ph) * .15;
            const r = this.r + Math.sin(this.ph) * .6;
            ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.rgb},${a})`; ctx.fill();
        }
    }

    const nodes = Array.from({ length: N }, () => new Node());

    const FPS = 1000 / 32;   // ~32 fps cap – smooth but not wasteful
    let last = 0;

    (function frame(ts) {
        requestAnimationFrame(frame);
        if (paused || ts - last < FPS) return;
        last = ts;
        ctx.clearRect(0, 0, w, h);

        // Edges
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
                const d  = Math.hypot(dx, dy);
                if (d >= DIST) continue;
                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.strokeStyle = `rgba(139,92,246,${(1 - d / DIST) * .11})`;
                ctx.lineWidth = .5; ctx.stroke();
            }
            // Mouse line
            const md = Math.hypot(mx - nodes[i].x, my - nodes[i].y);
            if (md < 120) {
                ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(mx, my);
                ctx.strokeStyle = `rgba(236,72,153,${(1 - md / 120) * .28})`;
                ctx.lineWidth = .5; ctx.stroke();
            }
        }

        nodes.forEach(n => { n.step(); n.draw(); });
    })(0);
})();

/* ============================================================
   CURSOR BLOB  (desktop)
   ============================================================ */
(function () {
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const blob = document.createElement('div');
    blob.className = 'cursor-blob';
    document.body.appendChild(blob);
    let bx = innerWidth / 2, by = innerHeight / 2, tx = bx, ty = by;
    document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function tick() {
        bx += (tx - bx) * .06; by += (ty - by) * .06;
        blob.style.left = bx + 'px'; blob.style.top = by + 'px';
        requestAnimationFrame(tick);
    })();
})();

/* ============================================================
   CUSTOM CURSOR  (desktop)
   ============================================================ */
(function () {
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const dot  = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot'; ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    let rx = innerWidth / 2, ry = innerHeight / 2, dx = rx, dy = ry;

    document.addEventListener('mousemove', e => {
        dx = e.clientX; dy = e.clientY;
        dot.style.left = dx + 'px'; dot.style.top = dy + 'px';
    }, { passive: true });

    (function lerp() {
        rx += (dx - rx) * .13; ry += (dy - ry) * .13;
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
        requestAnimationFrame(lerp);
    })();

    document.querySelectorAll('a,button,.skill-tag,.project-card,.side-nav-dot').forEach(el => {
        el.addEventListener('mouseenter', () => { dot.classList.add('expand');  ring.classList.add('expand');  });
        el.addEventListener('mouseleave', () => { dot.classList.remove('expand'); ring.classList.remove('expand'); });
    });
})();

/* ============================================================
   MOUSE TRAIL  (desktop)
   ============================================================ */
(function () {
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const COLS  = ['var(--primary)', 'var(--secondary)', 'var(--accent)'];
    const sizes = [5,4,4,3,3,5,3,4,5,3,4,3,5,4];
    const pool  = sizes.map((sz, i) => {
        const el = document.createElement('div');
        el.className = 'mouse-trail';
        el.style.cssText = `width:${sz}px;height:${sz}px;background:${COLS[i%3]};box-shadow:0 0 ${sz*3}px ${COLS[i%3]};`;
        document.body.appendChild(el);
        return el;
    });
    let idx = 0, last = 0;
    document.addEventListener('mousemove', e => {
        const now = Date.now();
        if (now - last < 38) return;
        last = now;
        const el = pool[idx++ % pool.length];
        el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px';
        el.classList.remove('burst'); void el.offsetWidth; el.classList.add('burst');
    }, { passive: true });
})();

/* ============================================================
   CLICK RIPPLE
   ============================================================ */
document.addEventListener('click', e => {
    const r = document.createElement('div');
    r.className = 'click-ripple';
    r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
});

/* ============================================================
   MOBILE NAVIGATION
   ============================================================ */
const hamburger = document.querySelector('.hamburger');
const navMenu   = document.querySelector('.nav-menu');
const navbar    = document.querySelector('.navbar');
const navLinks  = [...document.querySelectorAll('.nav-menu a')];

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});
navLinks.forEach(l => l.addEventListener('click', () => {
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
}));

/* ============================================================
   CACHED DOM REFERENCES  (query once, reuse everywhere)
   ============================================================ */
const bgLayers    = [...document.querySelectorAll('.bg-layer')];
const allSections = [...document.querySelectorAll('section')];
const heroOverlay = document.querySelector('.hero-bg-overlay-v2');
let   glassCards  = [];          // filled after DOMContentLoaded adds classes

/* ============================================================
   SCROLL PROGRESS + SCROLL-TO-TOP
   ============================================================ */
const scrollBar = document.createElement('div');
scrollBar.className = 'scroll-progress';
document.body.prepend(scrollBar);

const toTopBtn = document.createElement('button');
toTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
toTopBtn.className = 'scroll-to-top';
document.body.appendChild(toTopBtn);
toTopBtn.addEventListener('click', () => scrollTo(0));

/* ============================================================
   SIDE NAV DOTS
   ============================================================ */
const sideNav = document.createElement('nav');
sideNav.className = 'side-nav';
const LABELS = { home:'Home', about:'About', education:'Education', skills:'Skills',
                 projects:'Projects', publications:'Publications', experience:'Experience', contact:'Contact' };

allSections.forEach(sec => {
    const dot = document.createElement('div');
    dot.className = 'side-nav-dot';
    dot.setAttribute('data-label',   LABELS[sec.id] || sec.id);
    dot.setAttribute('data-section', sec.id);
    dot.addEventListener('click', () => scrollTo(sec.offsetTop - 80));
    sideNav.appendChild(dot);
});
document.body.appendChild(sideNav);

function updateSideNav(id) {
    sideNav.querySelectorAll('.side-nav-dot').forEach(d =>
        d.classList.toggle('active', d.getAttribute('data-section') === id)
    );
}

/* ============================================================
   SCROLL HANDLER  (rAF-throttled, uses cached refs)
   ============================================================ */
let ticking = false;

function onScroll() {
    const sy  = window.pageYOffset;
    const max = document.body.scrollHeight - innerHeight;

    // Progress bar
    scrollBar.style.width = Math.min(sy / max * 100, 100) + '%';

    // Navbar shrink
    navbar.classList.toggle('shrunk', sy > 50);

    // Scroll-to-top visibility
    toTopBtn.classList.toggle('visible', sy > 300);

    // Parallax (GPU-only transforms – no layout triggers)
    bgLayers.forEach((l, i) => { l.style.transform = `translateZ(0) translateY(${sy * (i+1) * .15}px)`; });
    if (heroOverlay) heroOverlay.style.transform = `scale(1.1) translateY(${sy * .05}px)`;

    // Active section highlight + side dots
    let cur = '';
    allSections.forEach(s => { if (sy >= s.offsetTop - 260) cur = s.id; });
    navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href').slice(1) === cur));
    updateSideNav(cur);

    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
}, { passive: true });

/* ============================================================
   ANCHOR LINKS  (routed through Lenis)
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
        const id = this.getAttribute('href');
        if (id === '#') return;
        e.preventDefault();
        const el = document.querySelector(id);
        if (el) scrollTo(el.getBoundingClientRect().top + pageYOffset - 80);
    });
});

/* ============================================================
   REVEAL ON SCROLL
   ============================================================ */
const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
}, { threshold: .1, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el => revealObs.observe(el));

/* ============================================================
   GLASS CARDS  (init classes + cached mousemove glow)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.project-card,.publication-card,.stat-card,.timeline-content,.skill-category').forEach(c => {
        if (!c.classList.contains('glass-card')) c.classList.add('glass-card');
    });
    // Cache after classes are added
    glassCards = [...document.querySelectorAll('.glass-card')];
});

// Mouse glow – uses cached list, skips hero overlay update (handled in scroll)
document.addEventListener('mousemove', e => {
    const cx = e.clientX, cy = e.clientY;

    // Hero bg parallax (only if in hero viewport)
    if (heroOverlay && pageYOffset < innerHeight) {
        heroOverlay.style.transform = `scale(1.1) translate(${(cx - innerWidth/2)/50}px,${(cy - innerHeight/2)/50}px)`;
    }

    // Per-card radial glow (cheap CSS variable update)
    glassCards.forEach(c => {
        const r = c.getBoundingClientRect();
        // Skip cards far from viewport to save work
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        c.style.setProperty('--x', ((cx-r.left)/r.width*100) + '%');
        c.style.setProperty('--y', ((cy-r.top)/r.height*100) + '%');
    });
}, { passive: true });

/* ============================================================
   MULTI-ROLE TYPING EFFECT
   ============================================================ */
const subtitleEl = document.querySelector('.hero-subtitle');
const ROLES = ['AI & ML Engineer','Deep Learning Researcher','Generative AI Developer','AI Systems Builder'];
let rIdx = 0, cIdx = 0, deleting = false;

function type() {
    if (!subtitleEl) return;
    const cur = ROLES[rIdx];
    subtitleEl.textContent = deleting ? cur.slice(0, cIdx - 1) : cur.slice(0, cIdx + 1);
    deleting ? cIdx-- : cIdx++;
    let delay = deleting ? 42 : 90;
    if (!deleting && cIdx === cur.length)  { delay = 2500; deleting = true; }
    else if (deleting && cIdx === 0)       { deleting = false; rIdx = (rIdx+1) % ROLES.length; delay = 380; }
    setTimeout(type, delay);
}
document.addEventListener('DOMContentLoaded', () => {
    if (subtitleEl) { subtitleEl.textContent = ''; setTimeout(type, 1200); }
});

/* ============================================================
   3D CARD TILT
   ============================================================ */
document.querySelectorAll('.project-card,.publication-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform .1s ease';
    });
    card.addEventListener('mousemove', e => {
        const r  = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top)  / r.height - .5) * 12;
        const ry = (.5 - (e.clientX - r.left) / r.width)  * 12;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px) scale(1.015)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1)';
        card.style.transform  = '';
    });
});

/* ============================================================
   MAGNETIC BUTTONS  (desktop)
   ============================================================ */
(function () {
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    document.querySelectorAll('.btn,.social-links a,.project-link').forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.transition = 'transform .15s ease'; });
        btn.addEventListener('mousemove', e => {
            const r  = btn.getBoundingClientRect();
            const dx = (e.clientX - (r.left + r.width  / 2)) * .28;
            const dy = (e.clientY - (r.top  + r.height / 2)) * .28;
            btn.style.transform = `translate(${dx}px,${dy}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1)';
            btn.style.transform  = '';
        });
    });
})();

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */
function animateCount(el, target, suffix) {
    const t0 = performance.now(), dur = 1800;
    (function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
    })(t0);
}
const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (!e.isIntersecting) return;
        const h3 = e.target.querySelector('h3');
        if (h3 && !h3.dataset.counted) {
            h3.dataset.counted = '1';
            const raw = h3.textContent.trim(), n = parseInt(raw);
            if (!isNaN(n)) animateCount(h3, n, raw.replace(/[0-9]/g,''));
        }
        countObs.unobserve(e.target);
    });
}, { threshold: .6 });
document.querySelectorAll('.stat-card').forEach(c => countObs.observe(c));

/* ============================================================
   STAGGERED SKILL TAGS
   ============================================================ */
const skillObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('.skill-tag').forEach((t, i) => {
            t.style.transitionDelay = `${i * 50}ms`;
            t.style.opacity = '1'; t.style.transform = 'translateY(0)';
        });
        skillObs.unobserve(e.target);
    });
}, { threshold: .15 });

document.querySelectorAll('.skill-category').forEach(cat => {
    cat.querySelectorAll('.skill-tag').forEach(t => {
        t.style.opacity = '0'; t.style.transform = 'translateY(10px)';
        t.style.transition = 'opacity .42s ease, transform .42s ease, background .35s ease, border-color .35s ease, color .35s ease, box-shadow .35s ease';
    });
    skillObs.observe(cat);
});

/* ============================================================
   HERO FLOATING PARTICLES
   ============================================================ */
(function () {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const wrap = document.createElement('div');
    wrap.className = 'hero-particles';
    hero.appendChild(wrap);
    const COLS = ['rgba(139,92,246,.75)','rgba(236,72,153,.65)','rgba(6,182,212,.65)'];
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div'), sz = Math.random()*5+2, c = COLS[i%3];
        p.className = 'hero-particle';
        p.style.cssText = `width:${sz}px;height:${sz}px;background:${c};left:${Math.random()*100}%;animation-duration:${Math.random()*12+9}s;animation-delay:${Math.random()*7}s;box-shadow:0 0 ${sz*4}px ${c};`;
        wrap.appendChild(p);
    }
})();

/* ============================================================
   TEXT SCRAMBLE ON SECTION TITLES
   ============================================================ */
(function () {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$&';
    function scramble(el) {
        const orig = el.textContent;
        el.classList.add('scrambling');
        let step = 0; const total = orig.length * 3;
        const iv = setInterval(() => {
            el.textContent = orig.split('').map((ch, i) => {
                if (ch === ' ') return ' ';
                return i < step / 3 ? orig[i] : CHARS[Math.floor(Math.random() * CHARS.length)];
            }).join('');
            if (++step >= total) { clearInterval(iv); el.textContent = orig; el.classList.remove('scrambling'); }
        }, 28);
    }
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting && !e.target.dataset.scrambled) {
                e.target.dataset.scrambled = '1';
                setTimeout(() => scramble(e.target), 180);
                obs.unobserve(e.target);
            }
        });
    }, { threshold: .6 });
    document.querySelectorAll('.section-title').forEach(el => obs.observe(el));
})();

/* ============================================================
   TIMELINE LINE GROW
   ============================================================ */
(function () {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('tl-visible'); obs.unobserve(e.target); } });
    }, { threshold: .1 });
    document.querySelectorAll('.timeline').forEach(t => obs.observe(t));
})();
