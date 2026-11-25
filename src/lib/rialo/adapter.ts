/**
 * Rialo chain adapter — the ONLY place game code touches "the chain".
 *
 * Status: only the mock implementation exists. Rialo's documented devnet RPC
 * (https://api.devnet.rialo.xyz, seen in the official CDK examples) is NOT
 * verified as live and public, so nothing here calls it. A live adapter is a
 * later phase, after the Rialo team / Discord Builder Hub confirms devnet access.
 *
 * Future on-chain path (not part of this build): a Rust program written with
 * rialo-cdk (Venus DSL), tested locally with TestContext first.
 *
 * Mechanic -> Rialo feature it would use when live:
 *   prices        -> native HTTPS calls (no third-party oracle)
 *   world events  -> reactivity (ON / EVERY triggers, no keeper bots)
 *   auction, loot -> TEE randomness + confidential execution
 *   yield, cycles -> scheduled transactions
 *   player login  -> Rialo Identity
 */
import type { AssetId, WorldEvent } from "@/lib/game/data";

export interface PriceTick {
  prices: Record<AssetId, number>;
  events: WorldEvent[];
}

export interface SealedBid {
  bidder: string;
  amount: number;
}

export interface RialoAdapter {
  /** "mock" until a live implementation is verified. */
  readonly mode: "mock" | "live";
  readonly networkLabel: string;
  /** Faucet grant for a new player. Would be a devnet faucet transfer. */
  claimFaucet(address: string): Promise<{ amount: number; reference: string }>;
  /** One market cycle: draw world events and move prices. Would be reactivity + HTTPS calls. */
  nextCycle(prev: Record<AssetId, number>, cycle: number): Promise<PriceTick>;
  /** Resolve sealed bids. Would run in a TEE with verifiable randomness for ties. */
  resolveAuction(bids: SealedBid[]): Promise<SealedBid | null>;
}

export { mockAdapter as rialo } from "./mock";
