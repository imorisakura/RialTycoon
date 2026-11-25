---
name: rialo
description: Verified facts about the Rialo blockchain for RialTycoon. Use whenever code, copy, or docs mention Rialo, its devnet, RPC endpoints, or which Rialo feature powers a game mechanic. Prevents describing Rialo as Solana and prevents invented endpoints or APIs.
---

# Rialo (facts for RialTycoon)

## What Rialo is
- Rialo is its own Layer 1 blockchain built by Subzero Labs.
- It is SVM-compatible (Solana-style programs can be ported), but Rialo is NOT the Solana network.
- Never describe Rialo as Solana. Never point the frontend at a Solana RPC.

## Native features (use these names in copy)
| Feature | What it means | RialTycoon mechanic it would power |
|---|---|---|
| Native HTTPS calls | Contracts fetch web data directly, no third-party oracle | Live RWA prices |
| Reactivity | Event-driven contracts (ON / EVERY triggers), no keeper bots | World events moving prices |
| TEE randomness | Verifiably fair randomness and confidential execution | Auction tie-breaks, sealed bids, loot fairness |
| Scheduled transactions | Timers that run on-chain | Yield payouts and cycle timing |
| Rialo Identity | Identity linked to real-world logins | Google identity of the player |

## Network status (as of 26 Nov 2026)
- Documented devnet RPC: `https://api.devnet.rialo.xyz` (appears in official CDK examples).
- It is NOT verified as a live, public RPC: a live check timed out. Treat it as unverified.
- Do not wire the app to any real Rialo RPC until the Rialo team / Discord Builder Hub confirms devnet access.

## Future on-chain path (not part of the current build)
- Rust program with `rialo-cdk` (Venus DSL), tested locally with `TestContext` first.

## Hard rules
- Do NOT invent endpoints, program IDs, faucet URLs, token mints, or deploy commands.
- If a Rialo fact is not in this file, say it is unverified instead of guessing.
- All prices and balances in RialTycoon are SIMULATION until the adapter is verified live.
