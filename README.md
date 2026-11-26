# RialTycoon

A GameFi tycoon game about trading tokenized real-world assets (RWA), built for the Rialo builders program.
Live demo: **https://rial-tycoon.vercel.app** (deployed on Vercel from `main`)
Public URL used in copy: **rialtycoon.rialo.app** (needs to be provided by the Rialo team)

> Balances are always **play money**. Prices are real in **Live Market** mode (third-party APIs, each quote labeled with its source) and simulated in **Simulation Season**. Nothing talks to a Rialo RPC yet. See [Live Market](#live-market-real-prices) and [Rialo status](#rialo-status).

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add NEXT_PUBLIC_PRIVY_APP_ID
npm run dev                  # http://localhost:3000
```

- **No app ID** → the app runs a clearly-labeled **simulated sign-in** ("UI review only · no Google OAuth"). Use it to review the UI. It never pretends to be real OAuth.
- **With an app ID** → real Google sign-in through Privy.

Production check: `npm run build && npm start`.

## Live Market (real prices)

The game has two modes, switched in the terminal header:

- **Live Market** — 43 assets with real prices: 20 crypto assets, 14 US stocks and index ETFs, 6 commodities and 3 income/FX assets. Commodities and income are tracked through US-listed ETFs (GLD, SLV, USO, UNG, CPER, DBA, IEF, VNQ, FXE), and each asset names its proxy. Balances are play money: a separate 10,000 $RIALO live account.
- **Simulation Season** — the original game: 8 assets, world events, cycles, yield, auction, and leaderboard, all simulated.

| Data | Source | Freshness | Key |
|---|---|---|---|
| Crypto ticks | Coinbase Exchange public WebSocket | real time, 24/7 (pairs listed on Coinbase) | none |
| Crypto prices + 24h change | CoinGecko Demo API | refreshed about every 10 min | `COINGECKO_API_KEY` |
| US stocks & ETFs | Finnhub `/quote` | refreshed about every 60 s, US market hours only | `FINNHUB_API_KEY` |
| Market news feed | Finnhub `/news` | about every 5 min | `FINNHUB_API_KEY` |

Notes:
- Stocks and ETFs only move during the US session (09:30–16:00 New York time, Mon–Fri; holidays are not modelled). Outside it, the game blocks stock/ETF trades. Only crypto trades 24/7.
- Any asset without data shows **Sim · no data** and uses a clearly-labeled fallback price.
- Free plans: CoinGecko Demo is about 10k calls/month, and Finnhub free is about 60 calls/min for personal use only. Check both providers' pricing pages before any commercial use.

### Add the keys on Vercel
1. Create a free CoinGecko Demo key (CoinGecko → Developer Dashboard) and a free Finnhub key (finnhub.io → Dashboard).
2. In Vercel: Project → Settings → Environment Variables. Add `COINGECKO_API_KEY` and `FINNHUB_API_KEY` for Production (and Preview if you like). **Do not** prefix them with `NEXT_PUBLIC_`.
3. Redeploy (Deployments → ⋯ → Redeploy). Open the Live Market: the status strip should say "CoinGecko: on" and "Finnhub … on".

For local development, put the same two lines in `.env.local` (never commit it).

## Privy dashboard setup (for real Google sign-in)

1. Create an app at the Privy dashboard and copy its **App ID** into `.env.local` as `NEXT_PUBLIC_PRIVY_APP_ID`.
2. Login methods: enable **Google only**. Leave every wallet / external wallet option off.
3. Embedded wallets: Ethereum, create on login for users without wallets (the code also sets this).
4. MFA: enable **Passkey** and **Authenticator app (TOTP)**. Keep **SMS disabled**.
5. Add your dev and production origins (for example `http://localhost:3000` and `https://rialtycoon.rialo.app`) to the allowed domains.
6. Never commit `.env.local`. The app needs no secret; `NEXT_PUBLIC_PRIVY_APP_ID` is public.

## How it is built

| Area | Where | Notes |
|---|---|---|
| Welcome opening | `src/components/opening/Opening.tsx`, `vault-scene.ts` | "The Vault Mechanism": a procedural Three.js gold vault coin (no external 3D assets). One pinned section (400vh, `scrub: 1`, snap per chapter) drives a camera journey: coin with giant wrapped typography → exploded mechanism with asset-class labels → dive into a particle price-world ("Why Rialo") → coin reassembles beside the Google sign-in. Preloader, grain, adaptive resolution for slow GPUs. Progress bar, `01 / 04` HUD, dot nav, Skip intro; inactive chapters are `inert`. `prefers-reduced-motion` renders a stacked static layout; no WebGL falls back to a CSS coin. |
| Landing page | `src/components/landing/Landing.tsx` | Navbar, hero, demo market panel, ticker, stats, featured assets, How to play, Why Rialo mapping, CTA, footer. Sticky "Sign in with Google" button on the whole page. |
| Auth | `src/lib/auth/*` | One `AuthApi` interface: `privy-auth.tsx` (real) and `sim-auth.tsx` (labeled simulation). `loginMethods: ["google"]`, no wallet UI. |
| Session check | `src/app/api/session/route.ts` | Verifies the Privy access token server-side against Privy's public JWKS (issuer `privy.io`, audience = app ID). Privy verifies the Google id_token during OAuth; the player identity is the Google `sub` (`user.google.subject`). |
| MFA policy | `src/lib/mfa/*` | 2FA only for: large sell (above threshold, default 100), auction bid, withdraw, export wallet, new device. Verification cached 15 minutes. Never forced at onboarding; a nudge + Security Center instead. |
| Game | `src/lib/game/*`, `src/components/game/*` | Zustand store (persisted locally), 8 assets in 4 classes, 14 world events, cycles, yield, rivals, sealed-bid auction, season leaderboard by return on capital, Tycoon tiers to 25,000 $RIALO. |
| Rialo adapter | `src/lib/rialo/adapter.ts` | Interface + mock implementation. The only place game code touches "the chain". |

### Wallet ordering

Privy creates the embedded wallet **after** the first login, not during it. The app never calls `createWallet` and never creates a Solana wallet, so it cannot block the EVM wallet slot. The onboarding screen waits for the wallet to appear before claiming the (simulated) faucet grant.

## Rialo status

- Rialo is its own SVM-compatible Layer 1 by Subzero Labs. It is not Solana.
- Documented devnet RPC: `https://api.devnet.rialo.xyz` (in the official CDK examples). **Not verified as live** (a live check timed out on 26 Nov 2026), so the app does not use it.
- The live adapter comes after the Rialo team or Discord Builder Hub confirms devnet access. The future on-chain path is a Rust program with `rialo-cdk` (Venus DSL), tested locally with `TestContext` first.

| Mechanic | Rialo feature that would power it |
|---|---|
| Live prices | Native HTTPS calls (no third-party oracle) |
| World events | Reactivity (ON / EVERY triggers, no keeper bots) |
| Auction & loot fairness | TEE randomness + confidential execution |
| Yield & cycle timing | Scheduled transactions |
| Google identity | Rialo Identity |

## What is still simulated or unverified

- All prices, balances, yield, rivals, the faucet grant and the auction reveal (mock adapter).
- The session key step and withdrawals (withdraw runs the 2FA gate, then explains it is disabled until devnet is verified).
- Device trust is kept in the browser (`localStorage`); Security Center "revoke" resets that list.
- TOTP limits (5-minute code, 4 wrong attempts) are enforced by the simulated flow. With a real app ID the code entry happens in Privy's own MFA modal, so confirm those limits in Privy's settings.
- The JWKS URL in `/api/session` follows Privy's documented pattern; confirm it once a real app ID exists.

## For the Rialo Discord presentation

Demo script (about 4 minutes):

1. **Opening scroll.** Open the site and scroll slowly: the gold vault coin turns and explodes into its mechanism (each layer an asset class), the camera dives through the rings into a world of price lines ("Why Rialo"), then the coin reassembles next to "Sign in with Google". Point out the `01 / 04` HUD, the dots and Skip intro. Use a laptop with a real GPU for the demo.
2. **Google sign-in.** Click "Sign in with Google". Show the onboarding steps: Google verified → identity bound to the Google sub → embedded wallet created → session key → 10,000 $RIALO faucet grant. Note that the player never sees a seed phrase or wallet pop-up.
3. **One event moving prices.** In the terminal buy some Oil, press **Next cycle** until a geopolitics event like "Shipping lanes disrupted in a key oil strait" appears in World Events, and show Oil jumping in Market Live. Explain that on Rialo this would be reactivity plus native HTTPS calls.
4. **One MFA-gated action.** Sell a small amount (no prompt), then a sell above 100 $RIALO or an auction bid: the 2FA gate appears (Passkey or authenticator app). Show the Security Center: SMS is disabled, 2FA is optional and never forced at onboarding.
5. Close on the "Why Rialo?" panel and the honest status: simulation today, live adapter after devnet access is confirmed.
