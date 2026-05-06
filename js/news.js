// HantaVirusTracker — Live news feed via rss2json (free, no API key)

const RSS_FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=hantavirus&hl=en-US&gl=US&ceid=US:en',
    source: 'Google News'
  },
  {
    url: 'https://news.google.com/rss/search?q=%22andes+virus%22+OR+%22hantavirus+outbreak%22&hl=en-US&gl=US&ceid=US:en',
    source: 'Outbreak News'
  }
];

async function loadNews() {
  const list = document.getElementById('news-list');
  if (!list) return;

  const t = TRANSLATIONS[localStorage.getItem('hanta_lang') || 'en'] || TRANSLATIONS.en;
  list.innerHTML = `<div class="news-loading">${t.news_loading}</div>`;

  try {
    const allItems = [];
    for (const feed of RSS_FEEDS) {
      try {
        const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=10`;
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

    if (allItems.length === 0) {
      list.innerHTML = `<div class="news-error">${t.news_error}</div>`;
      return;
    }

    // Dedupe by title
    const seen = new Set();
    const unique = allItems.filter(item => {
      const key = item.title.toLowerCase().trim();
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
        ? item.description.replace(/<[^>]*>/g, '').slice(0, 200) + (item.description.length > 200 ? '...' : '')
        : '';
      const sourceMatch = item.title.match(/-\s*([^-]+)$/);
      const sourceName = sourceMatch ? sourceMatch[1].trim() : item._source;
      const cleanTitle = item.title.replace(/\s*-\s*[^-]+$/, '');
      return `
        <div class="news-item">
          <a href="${item.link}" target="_blank" rel="noopener noreferrer">${cleanTitle}</a>
          <div class="news-meta">
            <span class="news-source">${sourceName}</span>
            <span>${dateStr}</span>
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
