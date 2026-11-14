# lessfomo-frontend

A live dashboard for [lessfomo](https://github.com/sebastt32/lessfomo), a Solana pump.fun memecoin screener that
only uses free data sources. It shows:

- **Top movers**: the momentum ranking, refreshed every minute.
- **Latest safety checks**: holder concentration, creator share and authority checks as they finish.
- **Token detail**: a token's info, a live candlestick chart, its momentum score over time and its safety check
  history.
- **Live chart**: candles with volume for 1s, 1m or 5m intervals, as price or market cap, in SOL or USD, with the
  creator's (dev) buys and sells marked. New trades update it as they happen.
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
│   ├── client.ts        fetch client (VITE_API_URL), typed ApiError, candles
│   └── stream.ts        EventSource wrappers: the global feed and the per-token trade stream
├── state/
│   ├── liveFeed.ts      Pure reducer for live data (unit-tested)
│   └── tokenChart.ts    Pure reducer for one token's candles and live trades
├── hooks/               useLiveFeed (REST snapshot + SSE), useTokenDetail, useTokenChart, useNow
├── lib/                 Formatting, external links, failure code labels, score series, candle math
├── components/
│   ├── atoms/           StatusBadge, ScoreBar, PriceDelta, Sparkline, StatusDot, ExternalLink
│   ├── molecules/       Panel, TokenName, TokenLinks, ConnectionIndicator, SourceStatusList, section states,
│   │                    SegmentedControl, CandlestickChart
│   ├── organisms/       AppHeader, MoversTable, ScreeningsFeed, TokenDetail, TokenChart, OfflineNotice, Disclaimer
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
5. The token's chart loads `/api/tokens/:mint/candles` for the selected interval and subscribes to
   `/api/tokens/:mint/stream`. Each `trade` event updates the forming candle or starts a new one (older trades are
   ignored); `sol-price` events keep the USD conversion current. Market cap is `price × totalSupply`, and USD
   values multiply by the SOL/USD price. USD is disabled while that price is unknown. The stream closes when the
   token detail closes or another token is selected, and the candles are fetched again after a reconnect.

### Charts

The momentum score line is inline SVG. The candlestick chart uses
[TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) (Apache 2.0), loaded as a separate
chunk the first time a token is opened. Its license requires attribution, so the TradingView logo on the chart is
kept enabled and the NOTICE text is shown under the chart. Tests replace the library with a recording fake (`src/test/lightweightChartsFake.ts`) because jsdom
has no canvas.

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
