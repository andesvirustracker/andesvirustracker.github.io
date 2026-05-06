// HantaVirusTracker — Leaflet heatmap

async function initHeatmap() {
  const container = document.getElementById('heatmap');
  if (!container || typeof L === 'undefined') return;

  const map = L.map('heatmap', {
    center: [10, -30],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    worldCopyJump: true,
    zoomControl: true,
    attributionControl: true
  });

  // Dark tile layer (free, no API key)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  let outbreakData = [];
  try {
    const res = await fetch('data/cases.json?t=' + Date.now());
    const data = await res.json();
    outbreakData = data.locations || [];
  } catch (err) {
    console.error('Failed to load map data:', err);
  }

  // Build heatmap points: [lat, lng, intensity]
  const heatPoints = outbreakData.map(loc => [loc.lat, loc.lng, loc.intensity || 0.5]);

  if (typeof L.heatLayer === 'function' && heatPoints.length > 0) {
    L.heatLayer(heatPoints, {
      radius: 35,
      blur: 25,
      maxZoom: 6,
      max: 1.0,
      gradient: {
        0.2: '#3b82f6',
        0.4: '#eab308',
        0.6: '#f97316',
        0.8: '#dc2626',
        1.0: '#7f1d1d'
      }
    }).addTo(map);
  }

  // Add markers with popups for each outbreak location
  outbreakData.forEach(loc => {
    const color = loc.intensity >= 0.8 ? '#dc2626'
              : loc.intensity >= 0.5 ? '#f97316'
              : loc.intensity >= 0.3 ? '#eab308' : '#3b82f6';
    const marker = L.circleMarker([loc.lat, loc.lng], {
      radius: 8 + (loc.intensity * 8),
      fillColor: color,
      color: '#fff',
      weight: 1,
      opacity: 0.9,
      fillOpacity: 0.7
    }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: sans-serif; color: #0a0a0a;">
        <strong style="color: ${color}; font-size: 1rem;">${loc.name}</strong><br>
        <span style="font-size: 0.85rem;">
          <strong>${loc.cases || 0}</strong> confirmed cases<br>
          <strong>${loc.deaths || 0}</strong> deaths
        </span>
      </div>
    `);
  });
}

document.addEventListener('DOMContentLoaded', initHeatmap);
