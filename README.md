# lessfomo-frontend

A live dashboard for [lessfomo](https://github.com/sebastt32/lessfomo), a Solana pump.fun memecoin screener that
only uses free data sources. It has three views, **Live**, **History** and **Insights**, and shows:

- **Conviction-wallet filter**: every list shows only tokens bought by conviction wallets: good-history wallets
  (they won most of the tokens they traded in the last 7 days with a net profit) that usually hold what they buy
  (sold within 2 minutes in at most 30% of their recent tokens). Flippers never count, because buying right after
  them usually means becoming their exit liquidity. The minimum is 3 by default (the public minimum) and can be
  raised to 5 or 10+; a banner above the lists says which filter is active.

- **Login**: the whole platform sits behind a sign-in page; see [Authentication](#authentication).
- **Color theme**: Auto (follows the device), Light or Dark, chosen in the header and remembered in the browser.
- **Top movers**: the momentum ranking, refreshed every minute, with each token's creation date and time and its
  liquidity (SOL in the market, bonding curve progress, or a "Migrated" badge once it moved to PumpSwap).
- **Latest safety checks**: holder concentration, creator share and authority checks as they finish, with the
  creation time when the live feed knows it.
- **Token history**: every token the screener ever detected, from its database, so old tokens do not disappear.
  Filter by creation date (today, last 7 days, this month, this year, a picked year, month or day, or a custom
  range), safety status, lifecycle (active or dead), minimum max score and text; sort by creation, liquidity, peak
  market cap or max score; paginate. Filters, sort and page live in the URL, so a filtered list can be shared.
- **Totals**: tokens tracked (active, dead, migrated), safety results, trades and snapshots, in the header.
- **Token detail**: a token's info with its creation date and time, liquidity and lifecycle, a live candlestick
  chart, its momentum score over time, its snapshots over time (at creation, 5 min, 1 h, day 3, migration, new
  peak, holder milestones...) and its safety check history. Its **Smart wallets** section lists every
  good-history wallet that bought the token (address with copy and Solscan link, tier and style at entry and now
  (conviction, flipper or mixed), bot flag, when and how much it bought, whether it still holds), explains why its
  record is good and how long it usually holds, says what conviction vs flipper means, and loads its recent
  results on demand.
- **Insights ("Does it work?")**: how often tokens reached 2×, their average and median return and the share of
  winners, grouped by how many good-history wallets bought them (none, 1, 2, 3, 4, 5+), or, with the toggle, by
  how many conviction wallets bought them, with the simulated cost and date range.
- **Smart-wallet counts**: conviction wallets first, then every good-history wallet and how many still hold
  (e.g. "3 conviction · 7 good · 2 holding"), in the movers, safety checks and history; the history can be sorted
  by conviction wallets.
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

Without the backend the app says it cannot reach the server and offers to try again; if the API goes away after
signing in, the dashboard shows an offline notice and reconnects on its own once the API is back. On a backend that predates the history API (`/api/tokens`, `/api/tokens/:mint/snapshots`, `/api/stats`,
`Mover.liquidity`), the live view keeps working: the history list says it is not available yet, the totals are
hidden and liquidity shows a dash. On a backend that predates smart wallets (`smartWallets` fields,
`/api/tokens/:mint/smart-wallets`, `/api/wallets/:address`, `/api/analysis/smart-wallets`), the lists are shown
unfiltered with a "smart-wallet data not available yet" notice instead of being hidden. On a backend that reports
good-history wallets but not trading styles (`smartWallets.conviction`, `styleAtEntry`, `style`, `flipRate`,
`medianHoldSeconds`, `by=conviction`), the lists show what the backend makes public with a "conviction data not
available yet" notice, the token detail says the trading style is not available yet, and Insights explains that
the conviction grouping is not available yet.

## Authentication

Nothing of the platform is rendered or requested until somebody is signed in: no data requests, no live stream,
no totals. The contract is the "Authentication" section of the backend's `docs/API.md`.

- **Session check**: on load the app asks `GET /api/auth/me`. A user opens the platform, `401` opens the sign-in
  page, and no answer shows "Cannot reach the server" with a retry button.
- **Sign in**: username and password are sent once to `POST /api/auth/login`. The server answers with an
  `HttpOnly` session cookie that scripts cannot read. The password is never kept in application state, the URL,
  `localStorage` or logs; the field is emptied as soon as it is sent. Messages: "Wrong username or password",
  "Too many attempts. Try again in N minutes" (from the `Retry-After` header) and "Cannot reach the server".
- **Shared links**: the sign-in page does not touch the URL, so a link with a view and filters opens that view
  after signing in.
- **Signed in**: the header shows the username, **Change password** (current password, a new one of at least 12
  characters, and its confirmation; the other sessions of the user are signed out) and **Sign out**. Signing out
  unmounts the whole platform, so no data from the session stays in memory.
- **Expired session**: a `401 UNAUTHENTICATED` from any request sends the app back to the sign-in page and closes
  the streams. `EventSource` hides HTTP statuses, so when a stream is closed by the server the app asks
  `/api/auth/me` to find out whether the session ended.
- **Accounts**: there is no sign-up. The administrator creates the super admin on the server (see the backend
  README).
- **Older backend**: if `/api/auth/me` does not exist (`404`), authentication is treated as not available and the
  platform is shown without a login, as before. This lets the frontend be deployed before the backend. The
  backend is what protects the data: once it requires a session, this app asks for one.

Every request is sent with `credentials: 'include'` and both streams with `withCredentials`, and state-changing
requests carry `Content-Type: application/json`. Behind the nginx proxy of the Docker image everything is
same-origin. When the app and the API are on different origins (local development), the backend must list the
app's origin in `CORS_ORIGIN`, and for the wait time of "Too many attempts" to be shown it must expose the
`Retry-After` header to browsers; otherwise the message says "a few minutes".

### URL parameters

| Parameter | Example | Meaning |
| --- | --- | --- |
| `view` | `history`, `insights` | Opens the history list or the insights; anything else is the live view |
| `minConvictionWallets` | `5` | Minimum conviction wallets that bought a token: `3` (default, the public minimum), `5` or `10` (10 or more); applies to every view. The old `minSmartWallets` is ignored |
| `by` | `conviction` | Insights only: group the analysis by conviction wallets instead of good-history wallets |
| `range` | `today`, `7d`, `this-month`, `this-year`, `2025`, `2025-02`, `2025-02-14`, `2026-11-01..2026-11-10` | Creation date filter; ranges include both days and either end may be left open (`2026-11-01..`) |
| `status` | `passed,failed` | Safety statuses |
| `lifecycle` | `active` or `dead` | Lifecycle |
| `minScore` | `50` | Minimum max score (0-100) |
| `q` | `frog` | Symbol, name or mint prefix |
| `sort` | `maxScore:desc` | `detectedAt`, `maxScore`, `peakMarketCapSol` or `liquidity`, with `:asc` or `:desc`; or `convictionWallets:desc` or `smartWallets:desc` |
| `page` | `2` | Page of 50 tokens |

Dates are the viewer's local days: they are sent to the API as ISO instants at local midnight.

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
│   ├── client.ts        fetch client (VITE_API_URL), typed ApiError, candles, token list, snapshots, stats,
│   │                    session endpoints (login, logout, getSession, changePassword), 401 subscription
│   └── stream.ts        EventSource wrappers: the global feed and the per-token trade stream
├── state/
│   ├── auth.ts          Pure reducer for the session: checking, signed out, signed in, unavailable, unreachable
│   ├── liveFeed.ts      Pure reducer for live data (unit-tested)
│   └── tokenChart.ts    Pure reducer for one token's candles and live trades
├── hooks/               useLiveFeed (REST snapshot + SSE), useTokenDetail, useTokenChart, useNow,
│                        useResource + useHistoryData (token list, snapshots, stats), useLocationSearch (URL state)
├── lib/                 Formatting, external links, failure code labels, score series, candle math,
│                        dateRange (date filters), historyQuery (URL state), milestones (snapshot labels),
│                        authErrors (API error codes to typed failures and their messages)
├── components/
│   ├── atoms/           Wordmark, StatusBadge, ScoreBar, PriceDelta, Sparkline, StatusDot, ExternalLink, DateTime,
│   │                    LifecycleBadge / MigratedBadge
│   ├── molecules/       Panel, TokenName, TokenLinks, ConnectionIndicator, SourceStatusList, section states,
│   │                    SegmentedControl, CandlestickChart, LiquidityCell / LiquidityMeter, Pagination, ViewNav,
│   │                    TextField, PasswordField (uncontrolled, with show/hide)
│   ├── organisms/       AppHeader, MoversTable, ScreeningsFeed, TokenDetail, TokenChart, OfflineNotice, Disclaimer,
│   │                    TokenHistoryTable, HistoryFilters, TokenSnapshots, StatsBar, LoginForm, AccountMenu,
│   │                    ChangePasswordDialog
│   └── templates/       DashboardTemplate, HistoryTemplate, LoginTemplate (layout slots only)
├── containers/          AuthProvider (session), LiveFeedProvider and one container per section; they read state
│                        and pass props down
├── pages/               AuthenticatedApp (session gate), LoginPage, AppShell (view + filters from the URL),
│                        DashboardPage and HistoryPage: wire containers into their template and own token selection
└── styles/              Design tokens (light and dark) and base styles
```

Data flow:

0. `AuthProvider` checks the session; the steps below only run while somebody is signed in (or on a backend
   without authentication).
1. `LiveFeedProvider` loads `/api/health`, `/api/movers` and `/api/screenings`, then subscribes to `/api/stream`.
2. Every response and stream event becomes an action for the `liveFeed` reducer. A `momentum` event replaces the
   ranking, a `screening` event is prepended to the feed (at most 100 kept), a `status` event updates the sources.
3. If the stream drops and recovers, the snapshot is fetched again to fill the gap.
4. Selecting a token loads `/api/tokens/:mint` and `/api/tokens/:mint/snapshots` in parallel; its score line
   combines the stored history with live readings. Its liquidity comes from the live ranking when the token is on
   it, otherwise from the newest snapshot.
5. The History view loads `/api/tokens` for the filters in the URL; the header loads `/api/stats` once a minute.
6. The token's chart loads `/api/tokens/:mint/candles` for the selected interval and subscribes to
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
