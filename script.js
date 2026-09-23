const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuButton?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.textContent = isOpen ? 'Close' : 'Menu';
});

navLinks?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  navLinks.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
  if (menuButton) menuButton.textContent = 'Menu';
}));

const cookieBanner = document.querySelector('#cookie-banner');
const cookieAccept = document.querySelector('#cookie-accept');

if (cookieBanner && !localStorage.getItem('cookie-notice-dismissed')) {
  cookieBanner.hidden = false;
}

cookieAccept?.addEventListener('click', () => {
  localStorage.setItem('cookie-notice-dismissed', 'true');
  cookieBanner.hidden = true;
});

const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');
const formLoadedAt = Date.now();

contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const name = formData.get('name').trim();
  const email = formData.get('email').trim();
  const message = formData.get('message').trim();
  const honeypot = formData.get('company').trim();

  if (honeypot || Date.now() - formLoadedAt < 2500) {
    formStatus.textContent = 'Unable to send this message. Please use the email link below.';
    return;
  }

  if (name.length < 2 || !contactForm.querySelector('#email').validity.valid || message.length < 20) {
    formStatus.textContent = 'Please enter your name, a valid email address, and a message of at least 20 characters.';
    return;
  }

  const subject = encodeURIComponent(`Portfolio message from ${name}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
  formStatus.textContent = 'Opening your email app with your message.';
  window.location.href = `mailto:aluruarunkumar19@gmail.com?subject=${subject}&body=${body}`;
});
