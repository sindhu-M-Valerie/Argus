# Argus
Real-Time Intelligence on Emerging Digital Harm/ Tracking Patterns. Protecting Truth.

Argus is a real-time civic risk intelligence platform focused on detecting emerging misinformation campaigns, coordinated hate activity, and online exploitation risks across India’s digital ecosystem.

Operating as a 24/7 signal dashboard, Argus aggregates publicly available data, verified reports, and trend signals to identify coordinated narrative amplification and harmful campaign patterns.

The platform is designed to prioritize behavioral analysis and ecosystem-level insights rather than amplifying harmful content.

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

```bash
npm run dev
```

The current UI is intentionally styled with a newspaper-inspired visual theme (paper texture background, masthead layout, and editorial panels) to match the product identity direction.

## Deploy Full App on Render (Recommended)

This is the closest to localhost behavior: one URL serves both frontend and API.

### 1) Deploy from blueprint

- Open Render dashboard → **New +** → **Blueprint**
- Select this repo in your GitHub account
- Render will use [render.yaml](render.yaml) and create a Node web service

### 2) Wait for first deploy

Render gives you a live URL like:

`https://argus-web.onrender.com`

### 3) Verify endpoints

- `https://argus-web.onrender.com/api/health`
- `https://argus-web.onrender.com/api/signals`
- `https://argus-web.onrender.com/api/live-sources?type=news&limit=5`

### 4) Use the same app URL for UI

- `https://argus-web.onrender.com`

This serves the same Express app as local `npm start` and keeps link rendering behavior consistent.

## Optional: GitHub Pages Frontend + Render API

If you still want Pages for frontend hosting, set [public/runtime-config.js](public/runtime-config.js):

```js
window.ARGUS_API_BASE = 'https://argus-web.onrender.com';
```

Then push to `main` so Pages picks up the API base.

GitHub Pages URL for this repo:

- `https://sindhu-m-valerie.github.io/Argus/`
