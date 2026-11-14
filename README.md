# lessfomo-frontend

A live dashboard for [lessfomo](https://github.com/sebastt32/lessfomo), a Solana pump.fun memecoin screener that
only uses free data sources. It shows:

- **Top movers**: the momentum ranking, refreshed every minute.
- **Latest safety checks**: holder concentration, creator share and authority checks as they finish.
- **Token detail**: a token's info, its momentum score over time and its safety check history.
- **Connection status**: whether the live feed is connected and the state of each data source.

This app has no backend of its own. It reads everything from the lessfomo HTTP + Server-Sent Events API.

> Passing the safety filters does not make a token profitable. This is a research tool, not financial advice.

## Requirements

- Node.js 20.19+ or 22.12+ and npm.
- The [lessfomo backend](https://github.com/sebastt32/lessfomo) running with its API enabled. By default it listens
  on `http://localhost:3001` and allows browser requests from `http://localhost:5173` (this app's dev server).
  The API contract lives in the backend repository at `docs/API.md`.

Without the backend the dashboard still loads and shows an offline notice. It reconnects on its own once the API
is back.

## Getting started

```bash
npm install
cp .env.example .env   # optional, only if the API is not on http://localhost:3001
npm run dev            # http://localhost:5173
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3001` | Base URL of the lessfomo API, without a trailing `/api` |

`VITE_API_URL` is read at build time. If you serve the dashboard from another origin, add that origin to the
backend's `CORS_ORIGIN` setting.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server on port 5173 |
| `npm run build` | Type-checks and builds the production bundle into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the test suite once (Vitest + Testing Library) |
| `npm run typecheck` | Runs the TypeScript compiler without emitting files |

## Architecture

The UI follows atomic design and the container/presentational pattern. Presentational components only receive
props; containers own data fetching and the live stream.

```text
src/
├── api/                 HTTP + SSE layer
│   ├── types.ts         Types mirroring the backend API contract
│   ├── client.ts        fetch client (VITE_API_URL), typed ApiError
│   └── stream.ts        EventSource wrapper: token, screening, momentum, status events
├── state/
│   └── liveFeed.ts      Pure reducer for live data (unit-tested)
├── hooks/               useLiveFeed (REST snapshot + SSE), useTokenDetail, useNow
├── lib/                 Formatting, external links, failure code labels, score series
├── components/
│   ├── atoms/           StatusBadge, ScoreBar, PriceDelta, Sparkline, StatusDot, ExternalLink
│   ├── molecules/       Panel, TokenName, TokenLinks, ConnectionIndicator, SourceStatusList, section states
│   ├── organisms/       AppHeader, MoversTable, ScreeningsFeed, TokenDetail, OfflineNotice, Disclaimer
│   └── templates/       DashboardTemplate (layout slots only)
├── containers/          LiveFeedProvider and one container per section; they read state and pass props down
├── pages/               DashboardPage: wires containers into the template and owns token selection
└── styles/              Design tokens (light and dark) and base styles
```

Data flow:

1. `LiveFeedProvider` loads `/api/health`, `/api/movers` and `/api/screenings`, then subscribes to `/api/stream`.
2. Every response and stream event becomes an action for the `liveFeed` reducer. A `momentum` event replaces the
   ranking, a `screening` event is prepended to the feed (at most 100 kept), a `status` event updates the sources.
3. If the stream drops and recovers, the snapshot is fetched again to fill the gap.
4. Selecting a token loads `/api/tokens/:mint`; its score line combines the stored history with live readings.

Charts are inline SVG; there is no chart library.

## Docker

The production image builds the app and serves it with nginx, proxying `/api` (including
the `/api/stream` Server-Sent Events) to the backend, so the browser only talks to one origin.

```bash
docker build -t lessfomo-frontend .
docker run -p 8080:80 -e BACKEND_URL=http://lessfomo-backend:3001 lessfomo-frontend
```

| Variable | When | Default | Description |
| --- | --- | --- | --- |
| `VITE_API_URL` | build arg | `/` | `/` means same-origin requests through the nginx proxy |
| `BACKEND_URL` | runtime | `http://lessfomo-backend:3001` | Internal URL of the backend on the Docker network |
