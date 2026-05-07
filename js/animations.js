// Scroll-triggered fade-in animations — restrained, editorial timing
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.fade-in-up').forEach(el => fadeObserver.observe(el));

// Hero particle — Tap to play / Tap to stop bouncing 3D mode
(() => {
  const slot     = document.querySelector('.hero-particle-slot');
  const particle = document.querySelector('.hero-particle');
  const playBtn  = document.querySelector('.hero-particle-button');
  const stopBtn  = document.querySelector('.particle-stop');
  if (!slot || !particle || !playBtn || !stopBtn) return;

  let state = 'idle';            // idle | bouncing | returning
  let raf = null;
  let returnTimer = null;
  let x = 0, y = 0, vx = 0, vy = 0;
  let rx = 0, ry = 0, rz = 0, vrx = 0, vry = 0, vrz = 0;
  let size = 360;

  function applyTransform() {
    particle.style.transform =
      `perspective(1400px) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)` +
      ` rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg)`;
  }

  function play() {
    if (state !== 'idle') return;

    const rect = slot.getBoundingClientRect();
    // Bouncing particle is 1.25× the idle size so it feels more present
    size = Math.round(rect.width * 1.25);
    x = rect.left + (rect.width  - size) / 2;
    y = rect.top  + (rect.height - size) / 2;

    // Random initial direction, modest speed
    const angle = Math.random() * Math.PI * 2;
    const speed = 6;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
    vrx = (Math.random() - 0.5) * 4;
    vry = (Math.random() - 0.5) * 4;
    vrz = (Math.random() - 0.5) * 2;
    rx = ry = rz = 0;

    particle.style.setProperty('--bounce-size', size + 'px');
    particle.classList.add('is-bouncing');
    document.body.classList.add('particle-locked');
    applyTransform();

    state = 'bouncing';
    playBtn.hidden = true;
    stopBtn.hidden = false;

    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    if (state !== 'bouncing') { raf = null; return; }

    x += vx;
    y += vy;

    const maxX = window.innerWidth  - size;
    const maxY = window.innerHeight - size;

    if (x <= 0)    { x = 0;    vx =  Math.abs(vx); bumpSpin(); }
    if (x >= maxX) { x = maxX; vx = -Math.abs(vx); bumpSpin(); }
    if (y <= 0)    { y = 0;    vy =  Math.abs(vy); bumpSpin(); }
    if (y >= maxY) { y = maxY; vy = -Math.abs(vy); bumpSpin(); }

    rx += vrx;
    ry += vry;
    rz += vrz;

    applyTransform();
    raf = requestAnimationFrame(tick);
  }

  // Each bounce nudges the spin so it feels reactive, like a real ball
  function bumpSpin() {
    vrx += (Math.random() - 0.5) * 3;
    vry += (Math.random() - 0.5) * 3;
    vrz += (Math.random() - 0.5) * 2;
    // soft cap so it never spirals out of control
    vrx = clamp(vrx, -8, 8);
    vry = clamp(vry, -8, 8);
    vrz = clamp(vrz, -6, 6);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function stop() {
    if (state !== 'bouncing') return;

    state = 'returning';
    if (raf) { cancelAnimationFrame(raf); raf = null; }

    stopBtn.hidden = true;
    document.body.classList.remove('particle-locked');

    // Compute current target position (slot may have moved if window resized)
    const target = slot.getBoundingClientRect();
    const targetX = target.left + (target.width  - size) / 2;
    const targetY = target.top  + (target.height - size) / 2;

    particle.classList.add('is-returning');

    // Force a paint so the upcoming transform change triggers the CSS transition
    requestAnimationFrame(() => {
      x = targetX; y = targetY;
      rx = 0; ry = 0; rz = 0;
      applyTransform();
    });

    // Safety: cleanup after the CSS transition duration
    if (returnTimer) clearTimeout(returnTimer);
    returnTimer = setTimeout(finishReturn, 760);
  }

  function finishReturn() {
    if (state !== 'returning') return;
    particle.classList.remove('is-returning', 'is-bouncing');
    particle.style.removeProperty('--bounce-size');
    particle.style.transform = '';
    state = 'idle';
    playBtn.hidden = false;
    returnTimer = null;
  }

  // ----- input wiring -----
  playBtn.addEventListener('click', play);
  stopBtn.addEventListener('click', stop);

  particle.addEventListener('click', () => {
    if (state === 'idle')     play();
    else if (state === 'bouncing') stop();
  });

  particle.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (state === 'idle')     play();
    else if (state === 'bouncing') stop();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state === 'bouncing') stop();
  });
})();
