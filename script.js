// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-menu a');
const navbar = document.querySelector('.navbar');

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Close mobile menu when clicking on a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// Initial scroll position for ticking
let lastScrollY = window.pageYOffset;
let ticking = false;

// Consolidated Scroll Handler for Performance
function updateScrollElements() {
    const scrollY = window.pageYOffset;

    // Navbar Scroll Effect
    if (scrollY > 50) {
        navbar.classList.add('shrunk');
    } else {
        navbar.classList.remove('shrunk');
    }

    // Parallax Background Shift
    const parallaxLayers = document.querySelectorAll('.bg-layer');
    parallaxLayers.forEach((layer, index) => {
        const speed = (index + 1) * 0.15;
        const yPos = scrollY * speed;
        layer.style.transform = `translateY(${yPos}px)`;
    });

    // Hero BG Shift (Alternative trigger if not mouse-only)
    const heroOverlayV2 = document.querySelector('.hero-bg-overlay-v2');
    if (heroOverlayV2) {
        const speed = 0.05;
        heroOverlayV2.style.transform = `scale(1.1) translateY(${scrollY * speed}px)`;
    }

    // Scroll to Top Button Visibility
    if (scrollY > 300) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }

    // Active Link Highlight
    const sections = document.querySelectorAll('section');
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 250)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });

    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(updateScrollElements);
        ticking = true;
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        e.preventDefault();
        const target = document.querySelector(targetId);

        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Reveal on Scroll Animation
const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// Handled in consolidated scroll handler

// Scroll to Top Button
const scrollToTopBtn = document.createElement('button');
scrollToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollToTopBtn.className = 'scroll-to-top';
document.body.appendChild(scrollToTopBtn);

// Visibility handled in consolidated scroll handler

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Professional Typing Effect
const subtitleElement = document.querySelector('.hero-subtitle');
const typingText = "AI & ML Engineer";
let charIndex = 0;

function typeEffect() {
    if (charIndex < typingText.length) {
        subtitleElement.textContent += typingText.charAt(charIndex);
        charIndex++;
        setTimeout(typeEffect, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (subtitleElement) {
        subtitleElement.textContent = '';
        setTimeout(typeEffect, 1000);
    }

    // Ensure all cards have the glass effect
    const cards = document.querySelectorAll('.project-card, .publication-card, .stat-card, .timeline-content, .skill-category');
    cards.forEach(card => {
        if (!card.classList.contains('glass-card')) {
            card.classList.add('glass-card');
        }
    });
});

// Creative Mouse Follow & Parallax Elements
const heroOverlayV2 = document.querySelector('.hero-bg-overlay-v2');
const parallaxLayers = document.querySelectorAll('.bg-layer');

document.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Hero BG Shift
    if (heroOverlayV2) {
        const moveX = (clientX - centerX) / 50;
        const moveY = (clientY - centerY) / 50;
        heroOverlayV2.style.transform = `scale(1.1) translate(${moveX}px, ${moveY}px)`;
    }

    // Local Glow for Glass Cards
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--x', `${x}%`);
        card.style.setProperty('--y', `${y}%`);
    });
});

// Handled in consolidated scroll handler
