# RialTycoon

GameFi tycoon game about trading tokenized real-world assets (RWA), built for the Rialo Discord builders presentation. Name is always "RialTycoon".

@AGENTS.md

## Rules
- Welcome opening ("The Vault Mechanism"): Three.js gold vault coin driven by GSAP ScrollTrigger — one pinned section 400vh (4 chapters as a camera journey, not horizontal panels: coin → exploded mechanism → particle price-world → reassembled + sign-in), scrub 1, snap per chapter, HUD 01/04, dot nav, Skip intro always visible, inactive chapters inert, prefers-reduced-motion = stacked static layout, no-WebGL = CSS coin fallback. Scene: `src/components/opening/vault-scene.ts`.
- Visual language: Instrument Serif display + Geist sans/mono, ivory → night palette with gold, grain overlay, custom SVG icons (`src/components/ui/Icons.tsx`) — no emoji in the UI.
- Auth is Google-only via Privy (`loginMethods: ["google"]`), embedded wallet created after first login. No connect wallet, no external wallets, no seed phrase UI anywhere.
- MFA is policy-based (Passkey default, TOTP fallback, SMS disabled): only large sells (threshold, default 100), auction bids, withdraw, export wallet, new device. Never on routine small trades, never forced during onboarding.
- All UI text is English and `<html lang="en">`.
- All prices and balances are SIMULATION until the Rialo adapter (`src/lib/rialo/adapter.ts`) is verified live. No invented Rialo endpoints — see `.claude/skills/rialo/SKILL.md`.
- Rialo is its own SVM-compatible L1 by Subzero Labs, not Solana.

## Layout
- `src/components/opening` — GSAP welcome opening
- `src/components/landing` — landing page
- `src/components/game` — market terminal (Zustand store in `src/lib/game/store.ts`)
- `src/lib/auth` — auth context (real Privy, or labeled simulated sign-in when no app ID)
- `src/lib/mfa` — MFA policy + gate
- `src/lib/rialo` — chain adapter (mock only)
