"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { rialo } from "@/lib/rialo/adapter";
import {
  ASSETS,
  ASSET_BY_ID,
  ASSET_CLASSES,
  RARE_ITEM,
  RIVALS,
  STARTING_GRANT,
  type AssetId,
  type EventSource,
} from "./data";

export type FeedKind = "event" | "trade" | "yield" | "system" | "auction";

export interface FeedEntry {
  id: string;
  kind: FeedKind;
  header: string;
  title: string;
  detail?: string;
  source?: EventSource;
}

export interface Holding {
  qty: number;
  cost: number; // total cost basis
}

export interface Rival {
  id: string;
  name: string;
  netWorth: number;
}

export interface AuctionState {
  round: number;
  endsAt: number;
  myBid: number; // escrowed cash
  rivalBids: { bidder: string; amount: number; at: number }[];
  lastResult?: { round: number; winner: string; amount: number; youWon: boolean };
}

const AUCTION_MS = 3 * 60 * 1000;
const HISTORY_LEN = 24;

const startPrices = () => Object.fromEntries(ASSETS.map((a) => [a.id, a.startPrice])) as Record<AssetId, number>;
const startHistory = () =>
  Object.fromEntries(
    ASSETS.map((a) => {
      // Seed a short simulated history so sparklines are readable from cycle 0.
      const pts = [a.startPrice];
      for (let i = 0; i < 11; i++) pts.unshift(Math.round(pts[0] * (1 + (Math.random() - 0.5) * 0.04) * 100) / 100);
      pts[pts.length - 1] = a.startPrice;
      return [a.id, pts];
    }),
  ) as Record<AssetId, number[]>;

function newAuction(round: number, now = Date.now()): AuctionState {
  const count = 1 + Math.floor(Math.random() * 3);
  const shuffled = [...RIVALS].sort(() => Math.random() - 0.5).slice(0, count);
  return {
    round,
    endsAt: now + AUCTION_MS,
    myBid: 0,
    rivalBids: shuffled.map((r) => ({
      bidder: r.name,
      amount: Math.round((RARE_ITEM.minBid + Math.random() * RARE_ITEM.minBid * 1.6) / RARE_ITEM.bidStep) * RARE_ITEM.bidStep,
      at: now + Math.random() * AUCTION_MS * 0.85,
    })),
  };
}

let seq = 0;
let settling = false;
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;
export const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export interface GameState {
  ownerId: string | null;
  address: string | null;
  faucetRef: string | null;
  cash: number;
  prices: Record<AssetId, number>;
  history: Record<AssetId, number[]>;
  holdings: Partial<Record<AssetId, Holding>>;
  cycle: number;
  cycleStartNetWorth: number;
  feed: FeedEntry[];
  rivals: Rival[];
  auction: AuctionState;
  items: string[];
  mfaThreshold: number;
  busy: boolean;

  initPlayer: (ownerId: string, address: string) => Promise<void>;
  buy: (id: AssetId, qty: number) => { ok: boolean; message: string };
  sell: (id: AssetId, qty: number) => { ok: boolean; message: string };
  nextCycle: () => Promise<void>;
  placeBid: (amount: number) => { ok: boolean; message: string };
  settleAuction: () => Promise<void>;
  setMfaThreshold: (n: number) => void;
  resetForSignOut: () => void;
}

export const netWorthOf = (s: Pick<GameState, "cash" | "holdings" | "prices" | "auction">) =>
  s.cash +
  s.auction.myBid +
  Object.entries(s.holdings).reduce((sum, [id, h]) => sum + (h?.qty ?? 0) * s.prices[id as AssetId], 0);

const blank = () => ({
  ownerId: null as string | null,
  address: null as string | null,
  faucetRef: null as string | null,
  cash: 0,
  prices: startPrices(),
  history: startHistory(),
  holdings: {},
  cycle: 0,
  cycleStartNetWorth: 0,
  feed: [] as FeedEntry[],
  rivals: RIVALS.map((r) => ({ id: r.id, name: r.name, netWorth: STARTING_GRANT })),
  auction: newAuction(1),
  items: [] as string[],
  busy: false,
});

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...blank(),
      mfaThreshold: 100,

      async initPlayer(ownerId, address) {
        const s = get();
        if (s.ownerId === ownerId && s.faucetRef) {
          if (s.address !== address) set({ address });
          return;
        }
        const grant = await rialo.claimFaucet(address);
        set({
          ...blank(),
          ownerId,
          address,
          faucetRef: grant.reference,
          cash: grant.amount,
          cycleStartNetWorth: grant.amount,
          feed: [
            {
              id: uid(),
              kind: "system",
              header: "CYCLE 0 · SOURCE: DEVNET FAUCET (SIMULATION)",
              title: `Faucet grant of ${fmt(grant.amount, 0)} $RIALO claimed`,
              detail: "Your starting capital. Reach a 25,000 $RIALO net worth to become a Tycoon.",
            },
          ],
        });
      },

      buy(id, qty) {
        const s = get();
        const price = s.prices[id];
        const total = Math.round(price * qty * 100) / 100;
        if (!Number.isFinite(qty) || qty <= 0) return { ok: false, message: "Enter a quantity above zero." };
        if (total > s.cash) return { ok: false, message: "Not enough cash for this order." };
        const h = s.holdings[id] ?? { qty: 0, cost: 0 };
        const msg = `Bought ${qty} ${ASSET_BY_ID[id].ticker} at ${fmt(price)} for ${fmt(total)} $RIALO`;
        set({
          cash: Math.round((s.cash - total) * 100) / 100,
          holdings: { ...s.holdings, [id]: { qty: h.qty + qty, cost: h.cost + total } },
          feed: [{ id: uid(), kind: "trade" as const, header: `CYCLE ${s.cycle} · TRADE (SIMULATION)`, title: msg }, ...s.feed].slice(0, 60),
        });
        return { ok: true, message: msg };
      },

      sell(id, qty) {
        const s = get();
        const h = s.holdings[id];
        if (!Number.isFinite(qty) || qty <= 0) return { ok: false, message: "Enter a quantity above zero." };
        if (!h || h.qty < qty) return { ok: false, message: "You do not hold that many units." };
        const price = s.prices[id];
        const total = Math.round(price * qty * 100) / 100;
        const remaining = h.qty - qty;
        const holdings = { ...s.holdings };
        if (remaining <= 0) delete holdings[id];
        else holdings[id] = { qty: remaining, cost: h.cost * (remaining / h.qty) };
        const msg = `Sold ${qty} ${ASSET_BY_ID[id].ticker} at ${fmt(price)} for ${fmt(total)} $RIALO`;
        set({
          cash: Math.round((s.cash + total) * 100) / 100,
          holdings,
          feed: [{ id: uid(), kind: "trade" as const, header: `CYCLE ${s.cycle} · TRADE (SIMULATION)`, title: msg }, ...s.feed].slice(0, 60),
        });
        return { ok: true, message: msg };
      },

      async nextCycle() {
        const s = get();
        if (s.busy) return;
        set({ busy: true });
        const cycle = s.cycle + 1;
        const tick = await rialo.nextCycle(s.prices, cycle);

        const entries: FeedEntry[] = tick.events.map((e) => ({
          id: uid(),
          kind: "event",
          header: `CYCLE ${cycle} · SOURCE: MARKET FEED (SIMULATION)`,
          title: e.title,
          source: e.source,
          detail: Object.entries(e.impact)
            .map(([a, v]) => `${ASSET_BY_ID[a as AssetId].name} ${v! > 0 ? "+" : ""}${(v! * 100).toFixed(1)}%`)
            .join(" · "),
        }));

        // Yield auto-pays on held assets (would be a Rialo scheduled transaction).
        const hasDeed = s.items.includes(RARE_ITEM.id);
        let yieldPaid = 0;
        for (const [id, h] of Object.entries(s.holdings)) {
          const cls = ASSET_CLASSES[ASSET_BY_ID[id as AssetId].classId];
          const rate = cls.yieldPerCycle + (hasDeed && cls.id === "metals" ? RARE_ITEM.yieldBuff : 0);
          yieldPaid += (h?.qty ?? 0) * tick.prices[id as AssetId] * rate;
        }
        yieldPaid = Math.round(yieldPaid * 100) / 100;
        if (yieldPaid > 0) {
          entries.push({
            id: uid(),
            kind: "yield",
            header: `CYCLE ${cycle} · YIELD (SIMULATION)`,
            title: `Yield paid: +${fmt(yieldPaid)} $RIALO`,
          });
        }

        const history = { ...s.history };
        for (const a of ASSETS) history[a.id] = [...s.history[a.id], tick.prices[a.id]].slice(-HISTORY_LEN);

        const rivals = s.rivals.map((r) => {
          const style = RIVALS.find((x) => x.id === r.id)?.style ?? 0.03;
          const move = 0.004 + (Math.random() - 0.45) * style * 2;
          return { ...r, netWorth: Math.round(r.netWorth * (1 + move) * 100) / 100 };
        });

        const cash = Math.round((s.cash + yieldPaid) * 100) / 100;
        set({
          cycle,
          prices: tick.prices,
          history,
          cash,
          rivals,
          cycleStartNetWorth: netWorthOf(s),
          feed: [...entries.reverse(), ...s.feed].slice(0, 60),
          busy: false,
        });
      },

      placeBid(amount) {
        const s = get();
        const a = s.auction;
        if (Date.now() >= a.endsAt) return { ok: false, message: "This auction round has ended." };
        const min = Math.max(RARE_ITEM.minBid, a.myBid + RARE_ITEM.bidStep);
        if (!Number.isFinite(amount) || amount < min) return { ok: false, message: `Minimum bid is ${fmt(min, 0)} $RIALO.` };
        const extra = amount - a.myBid;
        if (extra > s.cash) return { ok: false, message: "Not enough cash to escrow this bid." };
        set({
          cash: Math.round((s.cash - extra) * 100) / 100,
          auction: { ...a, myBid: amount },
          feed: [
            {
              id: uid(),
              kind: "auction" as const,
              header: `AUCTION ROUND ${a.round} · SEALED BID (SIMULATION)`,
              title: `You placed a sealed bid of ${fmt(amount, 0)} $RIALO on ${RARE_ITEM.name}`,
            },
            ...s.feed,
          ].slice(0, 60),
        });
        return { ok: true, message: `Sealed bid of ${fmt(amount, 0)} $RIALO placed.` };
      },

      async settleAuction() {
        const s = get();
        const a = s.auction;
        if (Date.now() < a.endsAt || settling) return;
        settling = true;
        const bids = [...a.rivalBids.map((b) => ({ bidder: b.bidder, amount: b.amount }))];
        if (a.myBid > 0) bids.push({ bidder: "You", amount: a.myBid });
        const winner = await rialo.resolveAuction(bids);
        const youWon = winner?.bidder === "You";
        const cur = get();
        set({
          cash: youWon ? cur.cash : Math.round((cur.cash + a.myBid) * 100) / 100,
          items: youWon && !cur.items.includes(RARE_ITEM.id) ? [...cur.items, RARE_ITEM.id] : cur.items,
          auction: {
            ...newAuction(a.round + 1),
            lastResult: winner ? { round: a.round, winner: winner.bidder, amount: winner.amount, youWon } : undefined,
          },
          feed: [
            {
              id: uid(),
              kind: "auction" as const,
              header: `AUCTION ROUND ${a.round} · REVEAL (SIMULATION)`,
              title: winner
                ? `${youWon ? "You" : winner.bidder} won ${RARE_ITEM.name} for ${fmt(winner.amount, 0)} $RIALO`
                : "No bids this round",
              detail: youWon ? undefined : a.myBid > 0 ? `Your ${fmt(a.myBid, 0)} $RIALO escrow was refunded.` : undefined,
            },
            ...cur.feed,
          ].slice(0, 60),
        });
        settling = false;
      },

      setMfaThreshold(n) {
        if (Number.isFinite(n) && n >= 0) set({ mfaThreshold: n });
      },

      resetForSignOut() {
        set({ busy: false });
      },
    }),
    {
      name: "rialtycoon-game",
      version: 1,
      partialize: ({ busy: _busy, ...rest }) => rest,
    },
  ),
);
