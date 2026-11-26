# RialTycoon

GameFi tycoon game about trading tokenized real-world assets (RWA), built for the Rialo Discord builders presentation. Name is always "RialTycoon".

@AGENTS.md

## Rules
- Welcome opening ("The Vault Mechanism"): Three.js gold vault coin driven by GSAP ScrollTrigger — one pinned section 400vh (4 chapters as a camera journey, not horizontal panels: coin → exploded mechanism → particle price-world → reassembled + sign-in), scrub 1, snap per chapter, HUD 01/04, dot nav, Skip intro always visible, inactive chapters inert, prefers-reduced-motion = stacked static layout, no-WebGL = CSS coin fallback. Scene: `src/components/opening/vault-scene.ts`.
- Visual language: Instrument Serif display + Geist sans/mono, ivory → night palette with gold, grain overlay, custom SVG icons (`src/components/ui/Icons.tsx`) — no emoji in the UI.
- Auth is Google-only via Privy (`loginMethods: ["google"]`), embedded wallet created after first login. No connect wallet, no external wallets, no seed phrase UI anywhere.
- MFA is policy-based (Passkey default, TOTP fallback, SMS disabled): only large sells (threshold, default 100), auction bids, withdraw, export wallet, new device. Never on routine small trades, never forced during onboarding.
- All UI text is English and `<html lang="en">`.
- Two game modes. **Simulation Season**: the original 8 assets, world events move prices, everything labeled SIMULATION. **Live Market**: ~43 assets (crypto, US stocks, commodities & income via ETFs) priced from third-party APIs — every quote shows its source (Coinbase / CoinGecko / Finnhub) or "Sim · no data" when it is a fallback. Balances are always play money (1 $RIALO = 1 USD).
- Market API keys (`COINGECKO_API_KEY`, `FINNHUB_API_KEY`) are server-only: read in `src/lib/market/providers.ts`, sent as headers, never `NEXT_PUBLIC_`, never in client code or URLs. Keep refresh intervals inside the free plans.
- No Rialo RPC is used yet (`src/lib/rialo/adapter.ts` is mock-only). No invented Rialo endpoints — see `.claude/skills/rialo/SKILL.md`.
- Rialo is its own SVM-compatible L1 by Subzero Labs, not Solana.

## Layout
- `src/components/opening` — GSAP welcome opening
- `src/components/landing` — landing page
- `src/components/game` — market terminal (Zustand store in `src/lib/game/store.ts`)
- `src/lib/auth` — auth context (real Privy, or labeled simulated sign-in when no app ID)
- `src/lib/mfa` — MFA policy + gate
- `src/lib/rialo` — chain adapter (mock only)
- `src/lib/market` — Live Market universe, server providers, client hook (polling + Coinbase WebSocket)
