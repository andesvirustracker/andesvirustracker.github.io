// HantaVirusTracker — Animated counter loader

async function loadCases() {
  try {
    const res = await fetch('data/cases.json?t=' + Date.now());
    const data = await res.json();
    animateCount('count-confirmed', data.confirmed || 0);
    animateCount('count-suspected', data.suspected || 0);
    animateCount('count-deaths', data.deaths || 0);
    animateCount('count-countries', data.countries || 0);
    const change = document.getElementById('change-confirmed');
    if (change && typeof data.change_24h === 'number') {
      const arrow = data.change_24h > 0 ? '▲' : data.change_24h < 0 ? '▼' : '—';
      change.textContent = `${arrow} ${Math.abs(data.change_24h)}`;
    }
    if (data.last_updated) {
      const els = document.querySelectorAll('.last-updated-time');
      const date = new Date(data.last_updated);
      const fmt = date.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      els.forEach(el => el.textContent = fmt);
    }
  } catch (err) {
    console.error('Failed to load case data:', err);
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1500;
  const start = performance.now();
  const startVal = 0;
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(startVal + (target - startVal) * eased);
    el.textContent = value.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', loadCases);
