# lessfomo-frontend

A live dashboard for [lessfomo](https://github.com/sebastt32/lessfomo), a Solana pump.fun memecoin screener that
only uses free data sources. It has two views, **Live** and **Daily record**, plus a separate view
for each token, and shows:

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
- **Totals**: tokens tracked (active, dead, migrated), safety results, trades and snapshots, in the header.
- **Token view**: selecting a token in any list opens it in its own full-width view with its own shareable URL
  (`?view=token&mint=<mint>`), instead of a side panel. "Back" returns to the list and filters you came from (the
  browser's Back button too). It shows a large live candlestick chart with the token's cycle marked on it, the
  cycle in plain language beside it, and below: its creation date and time, liquidity and lifecycle, its momentum
  score over time, its snapshots over time (at creation, 5 min, 1 h, day 3, migration, new
  peak, holder milestones...) and its safety check history. Its **Smart wallets** section lists every
  good-history wallet that bought the token (address with copy and Solscan link, tier and style at entry and now
  (conviction, flipper or mixed), bot flag, when and how much it bought, whether it still holds), explains why its
  record is good and how long it usually holds, says what conviction vs flipper means, and loads its recent
  results on demand.
- **Token cycle** (stable → explosion → crash): for every token, when it appeared in lessfomo (became public), how
  long it could be bought before its run-up (the invest window), its peak and its crash. On the chart: marks for
  Created, Appeared in lessfomo, Run-up starts, Explosion, Peak and Crash, a dashed line at the base price (the
  price when it appeared) and the invest window shaded; a legend under the chart lists every mark with its time
  and says which ones fall outside the loaded candles. Beside the chart: the phase (Stable, Exploding, Crashed,
  plus "Appeared late"), a sentence such as "Could be bought for 6 min 20 s before the run-up", "Still stable:
  12 min since it appeared" (counting) or "Appeared 3 min after it had already exploded", the rise before
  appearing, peak multiple, time to peak, deepest fall and last price vs base. The cycle is only known as it
  happens; nothing predicts the future. Movers and safety checks show the phase and window compactly.
- **Daily record**: every token that appeared in lessfomo on one local day (from the database, so a deploy never
  empties it), newest first, with its peak and last price over its appearance price and its result: reached 2×,
  still tracking (under 24 hours old) or no 2×. Above the list, the share of that day's tokens that reached 2×
  after appearing and the same share for the whole month. Previous day, next day (never past today), a date
  picker and "Today" move between days.
- **Smart-wallet counts**: conviction wallets first, then every good-history wallet and how many still hold
  (e.g. "3 conviction · 7 good · 2 holding"), in the movers and safety checks.
- **Live chart**: candles with volume for 1s, 1m, 5m, 15m or 1h intervals, as price or market cap, in SOL or USD, with the
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
signing in, the dashboard shows an offline notice and reconnects on its own once the API is back. On a backend that predates the history API (`/api/tokens/:mint/snapshots`, `/api/stats`, `Mover.liquidity`),
the live view keeps working: the totals are hidden and liquidity shows a dash. On a backend that predates smart wallets (`smartWallets` fields,
`/api/tokens/:mint/smart-wallets`, `/api/wallets/:address`), the lists are shown
unfiltered with a "smart-wallet data not available yet" notice instead of being hidden. On a backend that reports
good-history wallets but not trading styles (`smartWallets.conviction`, `styleAtEntry`, `style`, `flipRate`,
`medianHoldSeconds`), the lists show what the backend makes public with a "conviction data not
available yet" notice and the token detail says the trading style is not available yet. On a backend that predates token cycles (`cycle` fields and events,
`15m` / `1h` candles), the token view still works
with its chart and sections: the cycle parts say "Cycle data not available yet" and the lists show a dash.

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
| `view` | `record`, `token` | Opens the daily record or a token's own view (with `mint`); anything else, including the removed `history` and `insights`, is the live view |
| `day` | `2026-11-16` | Daily record only: the local day shown; omitted for today, and a future or invalid day shows today |
| `mint` | `7GCi…W2hr` | Token view only: the token's mint address. An unknown or non-public token shows "Token not found" with a way back |
| `minConvictionWallets` | `5` | Minimum conviction wallets that bought a token: `3` (default, the public minimum), `5` or `10` (10 or more); applies to every view. The old `minSmartWallets` is ignored |

Days are the viewer's local days: they are sent to the API as ISO instants at local midnight.

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
│   └── stream.ts        EventSource wrappers: the global feed and the per-token trade stream (both carry `cycle`)
├── state/
│   ├── auth.ts          Pure reducer for the session: checking, signed out, signed in, unavailable, unreachable
│   ├── liveFeed.ts      Pure reducer for live data (unit-tested)
│   ├── cycleFeed.ts     Pure reducer for token cycles seen in rankings and `cycle` events
│   └── tokenChart.ts    Pure reducer for one token's candles and live trades
├── hooks/               useLiveFeed (REST snapshot + SSE), useTokenDetail, useTokenChart, useNow,
│                        useResource + useHistoryData (snapshots, stats), useDailyRecord (day list and success),
│                        useLocationSearch (URL state), tokenNavigation (open a token's view, back target)
├── lib/                 Formatting, external links, failure code labels, score series, candle math,
│                        appLocation (view in the URL), dailyRecord (days, bounds, outcomes), milestones (snapshot labels),
│                        authErrors (API error codes to typed failures and their messages),
│                        cycle (cycle sentences, chart marks, shaded window),
│                        tokenLocation (token view URL and where "Back" goes)
├── components/
│   ├── atoms/           Wordmark, StatusBadge, ScoreBar, PriceDelta, Sparkline, StatusDot, ExternalLink, DateTime,
│   │                    LifecycleBadge / MigratedBadge / PhaseBadge / LateBadge
│   ├── molecules/       Panel, TokenName, TokenLinks, ConnectionIndicator, SourceStatusList, section states,
│   │                    SegmentedControl, CandlestickChart, LiquidityCell / LiquidityMeter, ViewNav, DayNavigator,
│   │                    TextField, PasswordField (uncontrolled, with show/hide), CycleCell, BackLink
│   ├── organisms/       AppHeader, MoversTable, ScreeningsFeed, TokenDetail, TokenChart, OfflineNotice, Disclaimer,
│   │                    DailyRecord, TokenSnapshots, StatsBar, LoginForm, AccountMenu,
│   │                    ChangePasswordDialog, TokenView, CycleSummary, CycleLegend
│   └── templates/       DashboardTemplate, HistoryTemplate, LoginTemplate (layout slots only)
├── containers/          AuthProvider (session), LiveFeedProvider and one container per section; they read state
│                        and pass props down
├── pages/               AuthenticatedApp (session gate), LoginPage, AppShell (view from the URL),
│                        DashboardPage, DailyRecordPage and TokenPage: wire containers into their template
└── styles/              Design tokens (light and dark) and base styles
```

Data flow:

0. `AuthProvider` checks the session; the steps below only run while somebody is signed in (or on a backend
   without authentication).
1. `LiveFeedProvider` loads `/api/health`, `/api/movers` and `/api/screenings`, then subscribes to `/api/stream`.
2. Every response and stream event becomes an action for the `liveFeed` reducer. A `momentum` event replaces the
   ranking, a `screening` event is prepended to the feed (at most 100 kept), a `status` event updates the sources.
3. If the stream drops and recovers, the snapshot is fetched again to fill the gap.
4. Selecting a token navigates to `?view=token&mint=<mint>`; the list it came from is remembered in the browser's
   history entry, so "Back" restores it (a link opened directly goes back to the live view). The
   token view loads `/api/tokens/:mint` and `/api/tokens/:mint/snapshots` in parallel; its score line
   combines the stored history with live readings. Its liquidity comes from the live ranking when the token is on
   it, otherwise from the newest snapshot.
5. The daily record loads `/api/tokens?dateField=appearedAt` for the day (every page) and `/api/analysis/cycles` for
   the day and its month; the header loads `/api/stats` once a minute.
6. The token's chart loads `/api/tokens/:mint/candles` for the selected interval and subscribes to
   `/api/tokens/:mint/stream`. Each `trade` event updates the forming candle or starts a new one (older trades are
   ignored); `sol-price` events keep the USD conversion current. Market cap is `price × totalSupply`, and USD
   values multiply by the SOL/USD price. USD is disabled while that price is unknown. The stream closes when the
   token view is left or another token is opened, and the candles are fetched again after a reconnect.
7. The token's cycle comes from `/api/tokens/:mint`, from `cycle` events on its own stream and from `cycle` events
   and rankings on `/api/stream`; the reading updated last wins. Cycle marks sit on the candle of their time
   bucket; a moment older or newer than the loaded candles is left off the chart and only listed in the legend.

### Charts

The momentum score line is inline SVG. The candlestick chart uses
[TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) (Apache 2.0), loaded as a separate
chunk the first time a token is opened. Its license requires attribution, so the TradingView logo on the chart is
kept enabled and the NOTICE text is shown under the chart. Cycle marks are series markers, the base price is a
price line, and the shaded invest window is an element laid over the chart and positioned from
`timeScale().timeToCoordinate`, updated on scroll, zoom, resize and new candles. Tests replace the library with a recording fake (`src/test/lightweightChartsFake.ts`) because jsdom
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
