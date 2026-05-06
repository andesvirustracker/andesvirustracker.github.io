# HantaVirusTracker

Live global tracker for the ongoing hantavirus outbreak — confirmed cases, deaths, outbreak heatmap, and live news feed.

🌐 **Live site:** https://williamklat.github.io/hantavirus-tracker/

## Features

- Live case + deaths counters (auto-updated every 30 minutes)
- Global outbreak heatmap (Leaflet.js)
- Live news feed (Google News RSS — WHO, Reuters, CDC coverage)
- Symptoms, transmission, and prevention info
- Variant comparison (Andes, Sin Nombre, Seoul, Puumala, Dobrava)
- Suspected case reporting form (Formspree)
- Trilingual (English, Spanish, Portuguese)
- Active outbreak alert banner

## Tech

- Plain HTML / CSS / JavaScript (no build step)
- Leaflet.js + Leaflet.heat (free CDN)
- rss2json.com (free) for news
- Formspree (free) for case reports
- GitHub Actions for case data scraping
- GitHub Pages for free hosting

## Auto-update

`.github/workflows/update-data.yml` runs every 30 minutes, scrapes WHO/CDC/Google News for hantavirus case mentions, and commits updated `data/cases.json` back to the repo.

## Disclaimer

Independent tracking project for public awareness. Not affiliated with WHO, CDC, or any government health agency. Always consult official sources for medical guidance.
