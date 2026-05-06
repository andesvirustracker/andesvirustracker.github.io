// HantaVirusTracker — Main shared logic

// Set "last updated" timestamp where relevant
function setLastUpdated() {
  const els = document.querySelectorAll('.last-updated-time');
  const now = new Date();
  const fmt = now.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  els.forEach(el => el.textContent = fmt);
}

document.addEventListener('DOMContentLoaded', setLastUpdated);
