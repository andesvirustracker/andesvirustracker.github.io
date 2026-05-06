// Scroll-triggered fade-in animations
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-in-up').forEach(el => fadeObserver.observe(el));

// Hero particle network canvas
const canvas = document.getElementById('hero-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let raf;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function makeParticle(randomY) {
    return {
      x: Math.random() * canvas.width,
      y: randomY ? Math.random() * canvas.height : canvas.height + 10,
      r: Math.random() * 2.5 + 0.8,
      speed: Math.random() * 0.4 + 0.2,
      opacity: Math.random() * 0.35 + 0.08,
      drift: (Math.random() - 0.5) * 0.4,
    };
  }

  function init() {
    particles = Array.from({ length: 70 }, () => makeParticle(true));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connecting lines first (behind dots)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          const alpha = (1 - dist / 90) * 0.1 * Math.min(particles[i].opacity, particles[j].opacity) * 4;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(220, 38, 38, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 38, 38, ${p.opacity})`;
      ctx.fill();

      p.y -= p.speed;
      p.x += p.drift;

      if (p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
        particles[i] = makeParticle(false);
      }
    });

    raf = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    resize();
    init();
    draw();
  });

  resize();
  init();
  draw();
}
