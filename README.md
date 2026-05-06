# ANDES Virus Tracker

Live tracker for the 2026 Andes hantavirus outbreak — confirmed cases, deaths, outbreak heatmap, and verified news feed.

🌐 **Live site:** https://williamklat.github.io/andesvirustracker/

## Features

- Live case + deaths counters (manually verified against WHO Disease Outbreak News)
- Global outbreak heatmap (Leaflet.js)
- News feed restricted to vetted authoritative sources only (WHO, Reuters, AP, BBC, NPR, CDC, ECDC, etc.)
- Symptoms, transmission, and prevention info
- Hantavirus variant comparison (Andes, Sin Nombre, Seoul, Puumala, Dobrava)
- Suspected case reporting form (Formspree)
- Trilingual (English, Spanish, Portuguese)
- Active outbreak alert banner
- Transparent verification panel showing primary sources for every figure

## Tech

- Plain HTML / CSS / JavaScript (no build step)
- Leaflet.js + Leaflet.heat (free CDN)
- rss2json.com for news (free, no API key)
- Formspree for case reports (free)
- GitHub Actions for monitoring WHO DON page (free)
- GitHub Pages for free hosting

## Update workflow

`.github/workflows/update-data.yml` runs every 30 minutes:
- Fetches the WHO Disease Outbreak News RSS
- If a NEW WHO DON about hantavirus is found, writes `data/pending_review.json` flagging it for human review
- **Never silently changes** confirmed/suspected/deaths numbers — those only update when manually verified against a primary source

## Disclaimer

Independent tracking project for public awareness. Not affiliated with WHO, CDC, or any government health agency. Always consult official sources for medical guidance.
