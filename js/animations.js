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

// Hero particle — Tap-to-bounce 3D sphere with gravity, restitution, auto-return.
//
// Design notes:
//   * In-plane rotation only (rotateZ). The source PNG is a 3D-rendered sphere
//     viewed front-on; rotating it in-plane keeps the sphere illusion intact at
//     every angle. rotateX/Y would tilt the flat plane edge-on and break it.
//   * Real-physics motion: gravity pulls the ball down, each bounce loses 20%
//     of velocity (restitution = 0.8), and the ball is launched upward like a
//     thrown ball.
//   * Hard viewport containment: position is clamped against the LIVE viewport
//     dimensions every single frame, and the particle size is capped to fit
//     the viewport. It cannot escape.
//   * Page scroll stays free while bouncing.
//   * Auto-returns to its idle slot after 6 seconds (or sooner if user taps).
(() => {
  const slot     = document.querySelector('.hero-particle-slot');
  const particle = document.querySelector('.hero-particle');
  const playBtn  = document.querySelector('.hero-particle-button');
  const stopBtn  = document.querySelector('.particle-stop');
  if (!slot || !particle || !playBtn || !stopBtn) return;

  // ---- Tunables ----
  const GRAVITY            = 0.55;   // px/frame² downward
  const RESTITUTION        = 0.8;    // 20% velocity loss per bounce
  const SPIN_FACTOR        = 0.65;   // 35% slower than before
  const SIZE_FACTOR        = 0.875;  // 30% smaller bouncing size than previous version
  const AUTO_RETURN_MS     = 6000;   // auto-return after 6s
  const RETURN_DURATION_MS = 720;    // CSS transition for the return

  let state = 'idle';                // idle | bouncing | returning
  let raf = null;
  let autoTimer = null;
  let returnDoneTimer = null;
  let x = 0, y = 0, vx = 0, vy = 0;
  let rz = 0, vrz = 0;
  let size = 320;

  // ---- Helpers ----
  function applyTransform() {
    particle.style.transform =
      `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rz.toFixed(1)}deg)`;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function computeSize(rectWidth) {
    const margin = 60;
    const cap = Math.min(window.innerWidth, window.innerHeight) - margin;
    const wanted = Math.round(rectWidth * SIZE_FACTOR);
    return Math.max(100, Math.min(wanted, cap));
  }

  function clearTimers() {
    if (autoTimer)       { clearTimeout(autoTimer);       autoTimer = null; }
    if (returnDoneTimer) { clearTimeout(returnDoneTimer); returnDoneTimer = null; }
  }

  // ---- Play / Stop / Return ----
  function play() {
    if (state !== 'idle') return;

    const rect = slot.getBoundingClientRect();
    size = computeSize(rect.width);

    x = rect.left + (rect.width  - size) / 2;
    y = rect.top  + (rect.height - size) / 2;
    x = clamp(x, 0, window.innerWidth  - size);
    y = clamp(y, 0, window.innerHeight - size);

    // Thrown upward — random horizontal, strong upward initial velocity
    vx = (Math.random() - 0.5) * 8;        // -4 .. +4
    vy = -(10 + Math.random() * 4);        // -14 .. -10  (upward in CSS coords)

    // 35% slower spin than before
    rz  = 0;
    vrz = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 2 + 2) * SPIN_FACTOR;

    particle.style.setProperty('--bounce-size', size + 'px');
    particle.classList.add('is-bouncing');
    applyTransform();

    state = 'bouncing';
    playBtn.hidden = true;
    stopBtn.hidden = false;

    if (!raf) raf = requestAnimationFrame(tick);

    // Auto-return after 6s
    clearTimers();
    autoTimer = setTimeout(() => {
      if (state === 'bouncing') stop();
    }, AUTO_RETURN_MS);
  }

  function tick() {
    if (state !== 'bouncing') { raf = null; return; }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Defensive: if the viewport shrank, downsize the particle to fit
    const cap = Math.min(vw, vh) - 60;
    if (size > cap) {
      size = Math.max(100, cap);
      particle.style.setProperty('--bounce-size', size + 'px');
    }

    const maxX = Math.max(0, vw - size);
    const maxY = Math.max(0, vh - size);

    // Gravity
    vy += GRAVITY;

    x += vx;
    y += vy;

    // Bounce off the four walls with 20% velocity loss each hit
    if (x < 0)    { x = 0;    vx =  Math.abs(vx) * RESTITUTION; bumpSpin(); }
    if (x > maxX) { x = maxX; vx = -Math.abs(vx) * RESTITUTION; bumpSpin(); }
    if (y < 0)    { y = 0;    vy =  Math.abs(vy) * RESTITUTION; bumpSpin(); }
    if (y > maxY) {
      y = maxY;
      vy = -Math.abs(vy) * RESTITUTION;
      bumpSpin();
      // Tiny ground friction so the ball doesn't slide forever along the floor
      vx *= 0.96;
      // Settle: if the upward velocity from this bounce is tiny, kill it so
      // the ball doesn't jitter against the floor pixel-by-pixel
      if (Math.abs(vy) < 1.2) vy = 0;
    }

    // Final safety clamp (paranoid — should already be in range)
    x = clamp(x, 0, maxX);
    y = clamp(y, 0, maxY);

    rz += vrz;

    applyTransform();
    raf = requestAnimationFrame(tick);
  }

  function bumpSpin() {
    vrz += (Math.random() - 0.5) * 1.3 * SPIN_FACTOR;
    vrz = clamp(vrz, -5.5, 5.5);
    if (Math.abs(vrz) < 0.4) vrz = vrz < 0 ? -0.4 : 0.4;
  }

  function stop() {
    if (state !== 'bouncing') return;

    state = 'returning';
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    clearTimers();

    stopBtn.hidden = true;

    // If the user scrolled away while bouncing, snap the slot back into view
    // so the ball doesn't fly off to a position outside the viewport
    slot.scrollIntoView({ block: 'center' });

    const target = slot.getBoundingClientRect();
    const targetX = target.left + (target.width  - size) / 2;
    const targetY = target.top  + (target.height - size) / 2;

    particle.classList.add('is-returning');

    // Force the browser to register the current transform before changing it,
    // so the CSS transition has a "from" state to interpolate from.
    requestAnimationFrame(() => {
      x = targetX; y = targetY;
      rz = 0;
      applyTransform();
    });

    returnDoneTimer = setTimeout(finishReturn, RETURN_DURATION_MS + 40);
  }

  function finishReturn() {
    if (state !== 'returning') return;
    particle.classList.remove('is-returning', 'is-bouncing');
    particle.style.removeProperty('--bounce-size');
    particle.style.transform = '';
    state = 'idle';
    playBtn.hidden = false;
    returnDoneTimer = null;
  }

  // ---- Input ----
  playBtn.addEventListener('click', play);
  stopBtn.addEventListener('click', stop);

  particle.addEventListener('click', () => {
    if (state === 'idle')          play();
    else if (state === 'bouncing') stop();
  });

  particle.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (state === 'idle')          play();
    else if (state === 'bouncing') stop();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state === 'bouncing') stop();
  });
})();
