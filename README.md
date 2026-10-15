# Argus
Real-Time Intelligence on Emerging Digital Harm/ Tracking Patterns. Protecting Truth.

Argus is a civic-risk intelligence dashboard focused on online harms in India. It gathers news from public feeds and GDELT, classifies relevant coverage by harm theme, and shows daily snapshots, regional signals, seven-day trends, and a separate AI Safety Pulse. It’s built with a Node/Express backend and a static dashboard deployed on GitHub Pages, with GitHub Actions refreshing and publishing the snapshots.

<img width="384" height="383" alt="Screenshot 2026-02-13 at 1 01 51 AM" src="https://github.com/user-attachments/assets/143eb149-0b77-4d6e-b8a6-91fdd1da10df" />


## Mission

Strengthen digital resilience by helping institutions and civil society identify, understand, and respond to evolving online harms responsibly.

## What Argus Does

- Monitors early signals of coordinated misinformation and manipulation campaigns.
- Tracks harmful amplification behavior and campaign infrastructure patterns.
- Surfaces exploitation and civic risk indicators from trusted, publicly available sources.
- Provides live situational awareness through a continuous monitoring dashboard.

## Trust & Safety Principles

- **Safety-first analysis:** Focus on behaviors, patterns, and coordination signals.
- **No harm amplification:** Avoid reproducing or boosting toxic and manipulative content.
- **Context over virality:** Emphasize ecosystem insights, not sensational snippets.
- **Responsible use:** Support prevention, research, and policy response with care.

## Who It Supports

- Researchers and civic integrity analysts
- Digital safety and Trust & Safety teams
- Journalists and investigative networks
- Policymakers and institutional response teams

## Platform Focus

Argus is built to provide timely, actionable intelligence on online risk dynamics while maintaining a clear commitment to responsible analysis, public-interest outcomes, and digital ecosystem resilience in India.

## Data Accuracy & Provenance

Argus only shows articles it actually collected. Every item on the dashboard:

- comes from a real RSS feed (Google News topic searches, PIB Fact Check, BOOM Live) or the GDELT news API, with a working source link;
- carries its real publication time, and appears only under the IST date it was published;
- is assigned a theme from its own headline and summary, not from the feed it arrived through;
- is dropped if it matches none of the 17 harm themes.

AI research and industry feeds (arXiv, Hugging Face, AI funding and agent-launch news) feed only the **AI Safety Pulse** panel. They never appear in the harm stream.

On GitHub Pages there is no server, so the dashboard reads snapshots in `public/data/`. A scheduled workflow (`.github/workflows/refresh-snapshots.yml`) runs every 6 hours, fetches all sources, runs the data-quality tests and commits the results, then Pages redeploys. Days that were never collected show "No archive exists for this date" rather than borrowed or placeholder content.

**7-day trends** (`trend.html`, `/api/signals`) are computed from those archived snapshots: articles per theme per day, distinct sources, high-risk counts, and the articles themselves. A day that wasn't collected is shown as "not collected", never as zero. A direction (Rising / Falling / Stable) is only reported with at least 4 collected days and 5 articles in the window; otherwise the page says "Insufficient history" or "Low volume".

Risk scores (0–100) combine theme severity, how much theme-specific evidence the text contains, source trust, and how many independent sources cover the same story. Recency affects sort order, not risk.

Replace the example dates with the date or range you want.

```bash
node generate-daily-snapshot.js
node generate-daily-snapshot.js --no-gdelt
node generate-daily-snapshot.js --backfill YYYY-MM-DD
node generate-daily-snapshot.js --backfill-range YYYY-MM-DD YYYY-MM-DD
node generate-daily-snapshot.js --rebuild YYYY-MM-DD
npm test
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Run Locally

1. Install dependencies:
	```bash
	npm install
	```
2. Start the app:
	```bash
	npm start
	```
3. Open:
	- Dashboard: http://localhost:3000
	- Health API: http://localhost:3000/api/health
	- Signals API: http://localhost:3000/api/signals
	- Live Sources API: http://localhost:3000/api/live-sources

### Development Mode

## Deployment

Argus is available as a static dashboard on GitHub Pages and as a full Node/Express app on Render.

### GitHub Pages: Static Dashboard

[Open the dashboard](https://sindhu-m-valerie.github.io/Argus/)

GitHub Pages serves the frontend and archived snapshots in `public/data/`; it does not run the Express API. The snapshot workflow fetches and commits data every six hours, then the Pages workflow republishes the site.


