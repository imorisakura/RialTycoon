import { ASSETS, ASSET_BY_ID, ASSET_CLASSES, WORLD_EVENTS, type AssetId } from "@/lib/game/data";
import type { PriceTick, RialoAdapter, SealedBid } from "./adapter";

/** Standard normal sample (Box-Muller). */
function gaussian() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickEvents(count: number) {
  const pool = [...WORLD_EVENTS];
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Local simulation. Nothing in here touches a network. */
export const mockAdapter: RialoAdapter = {
  mode: "mock",
  networkLabel: "Rialo devnet (simulated)",

  async claimFaucet(address) {
    return { amount: 10_000, reference: `sim-faucet-${address.slice(-6)}-${Date.now().toString(36)}` };
  },

  async nextCycle(prev, cycle): Promise<PriceTick> {
    const events = pickEvents(cycle % 3 === 0 ? 2 : 1);
    const prices = {} as Record<AssetId, number>;
    for (const asset of ASSETS) {
      const vol = ASSET_CLASSES[ASSET_BY_ID[asset.id].classId].volatility;
      const shock = events.reduce((s, e) => s + (e.impact[asset.id] ?? 0), 0);
      const drift = 0.002 + gaussian() * vol;
      prices[asset.id] = Math.max(1, round2(prev[asset.id] * (1 + drift + shock)));
    }
    return { prices, events };
  },

  async resolveAuction(bids: SealedBid[]) {
    if (!bids.length) return null;
    const top = Math.max(...bids.map((b) => b.amount));
    const tied = bids.filter((b) => b.amount === top);
    // Tie-break stands in for TEE randomness.
    return tied[Math.floor(Math.random() * tied.length)];
  },
};
