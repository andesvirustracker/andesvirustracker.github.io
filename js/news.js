// HantaVirusTracker — News feed restricted to vetted authoritative sources only.
// Articles from any other domain are filtered out before display.

const TRUSTED_DOMAINS = [
  'who.int',
  'cdc.gov',
  'ecdc.europa.eu',
  'paho.org',
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'bbc.co.uk',
  'npr.org',
  'france24.com',
  'aljazeera.com',
  'washingtonpost.com',
  'nytimes.com',
  'cnn.com',
  'theguardian.com',
  'nbcnews.com',
  'cbsnews.com',
  'ctvnews.ca',
  'africacdc.org',
  'contagionlive.com'
];

// Build site: filter for Google News RSS — only return articles from trusted domains
const SITE_FILTER = TRUSTED_DOMAINS.map(d => `site:${d}`).join('+OR+');

const RSS_FEEDS = [
  {
    url: `https://news.google.com/rss/search?q=hantavirus+(${SITE_FILTER})&hl=en-US&gl=US&ceid=US:en`,
    source: 'Vetted Sources'
  },
  {
    url: `https://news.google.com/rss/search?q=%22Andes+virus%22+OR+%22MV+Hondius%22+(${SITE_FILTER})&hl=en-US&gl=US&ceid=US:en`,
    source: 'Vetted Sources'
  }
];

function isTrustedLink(link) {
  if (!link) return false;
  try {
    const url = new URL(link);
    const hostname = url.hostname.replace(/^www\./, '');
    return TRUSTED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch (e) {
    return false;
  }
}

async function loadNews() {
  const list = document.getElementById('news-list');
  if (!list) return;

  const t = TRANSLATIONS[localStorage.getItem('hanta_lang') || 'en'] || TRANSLATIONS.en;
  list.innerHTML = `<div class="news-loading">${t.news_loading}</div>`;

  try {
    const allItems = [];
    for (const feed of RSS_FEEDS) {
      try {
        const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=20`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'ok' && data.items) {
          data.items.forEach(item => {
            allItems.push({ ...item, _source: feed.source });
          });
        }
      } catch (e) {
        console.warn('Feed failed:', feed.url, e);
      }
    }

    // Filter: keep only links from trusted domains
    const trusted = allItems.filter(item => isTrustedLink(item.link));

    if (trusted.length === 0) {
      list.innerHTML = `<div class="news-error">${t.news_error}</div>`;
      return;
    }

    // Dedupe by title
    const seen = new Set();
    const unique = trusted.filter(item => {
      const key = item.title.toLowerCase().trim().slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date desc
    unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    list.innerHTML = unique.slice(0, 20).map(item => {
      const date = new Date(item.pubDate);
      const dateStr = date.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      const desc = item.description
        ? item.description.replace(/<[^>]*>/g, '').slice(0, 220) + (item.description.length > 220 ? '...' : '')
        : '';
      // Pull domain from link for source label
      let domain = '';
      try {
        domain = new URL(item.link).hostname.replace(/^www\./, '');
      } catch (e) {}
      const cleanTitle = item.title.replace(/\s*-\s*[^-]+$/, '');
      return `
        <div class="news-item">
          <a href="${item.link}" target="_blank" rel="noopener noreferrer">${cleanTitle}</a>
          <div class="news-meta">
            <span class="news-source">${domain || 'Source'}</span>
            <span>${dateStr}</span>
            <span style="color: var(--safe-green);">✓ Verified Source</span>
          </div>
          ${desc ? `<div class="news-description">${desc}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('News load failed:', err);
    list.innerHTML = `<div class="news-error">${t.news_error}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadNews, 100);
});
