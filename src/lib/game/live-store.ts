"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LIVE_BY_ID, type LiveQuote } from "@/lib/market/universe";
import { fmt } from "./store";

/** Live Market account: play money (1 $RIALO = 1 USD) traded at live quotes. Separate from Simulation Season. */
export const LIVE_GRANT = 10_000;

export interface LiveHolding {
  qty: number;
  cost: number;
}

export interface LiveTrade {
  id: string;
  at: number;
  text: string;
}

interface LiveState {
  ownerId: string | null;
  cash: number;
  holdings: Record<string, LiveHolding>;
  trades: LiveTrade[];
  startedAt: number;
  ensureAccount: (ownerId: string) => void;
  buy: (id: string, amount: number, quote: LiveQuote) => { ok: boolean; message: string };
  sell: (id: string, amount: number, quote: LiveQuote) => { ok: boolean; message: string };
  reset: () => void;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const qtyFmt = (q: number) => (q >= 1 ? q.toLocaleString("en-US", { maximumFractionDigits: 4 }) : q.toPrecision(4));
let n = 0;
const uid = () => `${Date.now().toString(36)}-${(n++).toString(36)}`;

export const liveNetWorth = (s: Pick<LiveState, "cash" | "holdings">, quotes: Record<string, LiveQuote>) =>
  s.cash + Object.entries(s.holdings).reduce((sum, [id, h]) => sum + h.qty * (quotes[id]?.price ?? 0), 0);

export const useLive = create<LiveState>()(
  persist(
    (set, get) => ({
      ownerId: null,
      cash: LIVE_GRANT,
      holdings: {},
      trades: [],
      startedAt: 0,

      ensureAccount(ownerId) {
        if (get().ownerId === ownerId) return;
        set({ ownerId, cash: LIVE_GRANT, holdings: {}, trades: [], startedAt: Date.now() });
      },

      buy(id, amount, quote) {
        const s = get();
        const a = LIVE_BY_ID[id];
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Enter an amount above zero." };
        if (amount > s.cash + 1e-9) return { ok: false, message: "Not enough cash for this order." };
        const qty = amount / quote.price;
        const h = s.holdings[id] ?? { qty: 0, cost: 0 };
        const text = `Bought ${qtyFmt(qty)} ${a.ticker} at ${fmt(quote.price, quote.price < 1 ? 4 : 2)} for ${fmt(amount)} $RIALO`;
        set({
          cash: r2(s.cash - amount),
          holdings: { ...s.holdings, [id]: { qty: h.qty + qty, cost: h.cost + amount } },
          trades: [{ id: uid(), at: Date.now(), text }, ...s.trades].slice(0, 50),
        });
        return { ok: true, message: text };
      },

      sell(id, amount, quote) {
        const s = get();
        const a = LIVE_BY_ID[id];
        const h = s.holdings[id];
        if (!h) return { ok: false, message: `You do not hold any ${a.ticker}.` };
        const value = h.qty * quote.price;
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Enter an amount above zero." };
        const sellAll = amount >= value - 0.005;
        const qty = sellAll ? h.qty : amount / quote.price;
        const proceeds = r2(qty * quote.price);
        const holdings = { ...s.holdings };
        if (sellAll) delete holdings[id];
        else holdings[id] = { qty: h.qty - qty, cost: h.cost * ((h.qty - qty) / h.qty) };
        const text = `Sold ${qtyFmt(qty)} ${a.ticker} at ${fmt(quote.price, quote.price < 1 ? 4 : 2)} for ${fmt(proceeds)} $RIALO`;
        set({ cash: r2(s.cash + proceeds), holdings, trades: [{ id: uid(), at: Date.now(), text }, ...s.trades].slice(0, 50) });
        return { ok: true, message: text };
      },

      reset() {
        set({ cash: LIVE_GRANT, holdings: {}, trades: [], startedAt: Date.now() });
      },
    }),
    { name: "rialtycoon-live", version: 1 },
  ),
);
