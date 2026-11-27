"use client";

import { motion } from "framer-motion";
import { Rolling } from "@/components/ui/Rolling";
import { useMemo, useState } from "react";
import { LiveAssetIcon } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Modal";
import { Delta } from "@/components/ui/Sparkline";
import { useToast } from "@/components/ui/Toasts";
import { LIVE_GRANT, liveNetWorth, useLive } from "@/lib/game/live-store";
import { fmt, useGame } from "@/lib/game/store";
import { useMarketNews, type StreamState } from "@/lib/market/useLiveMarket";
import {
  CATEGORY_LABEL,
  LIVE_ASSETS,
  LIVE_BY_ID,
  tradesAroundTheClock,
  type LiveCategory,
  type LiveQuote,
  type MarketPayload,
  type QuoteSource,
} from "@/lib/market/universe";
import { useMfaGate } from "@/lib/mfa/gate";
import { sellNeedsMfa } from "@/lib/mfa/policy";
import { AnimatedNumber, Panel } from "./bits";

const priceDecimals = (p: number) => (p >= 1000 ? 2 : p >= 1 ? 2 : p >= 0.01 ? 4 : 6);
const fmtPrice = (p: number) => fmt(p, priceDecimals(p));

const SOURCE: Record<QuoteSource, { label: string; tone: "up" | "gold" | "warn" }> = {
  coinbase: { label: "Coinbase", tone: "up" },
  coingecko: { label: "CoinGecko", tone: "up" },
  finnhub: { label: "Finnhub", tone: "up" },
  sim: { label: "Sim, no data", tone: "warn" },
};

export interface LiveData {
  market: MarketPayload | null;
  quotes: Record<string, LiveQuote>;
  stream: StreamState;
  error: string | null;
}

/** "Live prices" only when at least one quote really comes from a live source. */
export function LivePricesBadge({ quotes }: { quotes: Record<string, LiveQuote> }) {
  const all = Object.values(quotes);
  const live = all.filter((q) => q.source !== "sim").length;
  if (!all.length) return <Badge tone="muted">Loading prices</Badge>;
  if (!live) return <Badge tone="warn">Simulated prices</Badge>;
  return <Badge tone="up">{live === all.length ? "Live prices" : `${live} of ${all.length} prices live`}</Badge>;
}

function SourceBadge({ source }: { source: QuoteSource }) {
  const s = SOURCE[source];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function FlashPrice({ value }: { value: number }) {
  return <Rolling value={value} format={fmtPrice} className="font-medium" />;
}

const ago = (ms: number) => {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`;
};

/** Honest data-status strip: where each price comes from and how fresh it is. */
export function LiveStatus({ data }: { data: LiveData }) {
  const { market, stream, error } = data;
  const sims = Object.values(data.quotes).filter((q) => q.source === "sim").length;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-control border border-line bg-panel px-4 py-3 text-xs text-muted">
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${stream === "live" ? "bg-up" : stream === "connecting" ? "bg-gold" : "bg-white/30"}`} />
        Crypto stream (Coinbase): {stream === "live" ? "live, 24/7" : stream === "connecting" ? "connecting…" : "offline"}
      </span>
      <span>CoinGecko: {market ? (market.providers.coingecko ? "on (refresh ≈10 min)" : "no API key") : "…"}</span>
      <span>
        Finnhub stocks &amp; ETFs: {market ? (market.providers.finnhub ? "on (refresh ≈1 min)" : "no API key") : "…"}
        {market && `. US market ${market.usMarketOpen ? "open" : "closed"}`}
      </span>
      {sims > 0 && <span className="text-ink">{sims} of {Object.keys(data.quotes).length} prices simulated</span>}
      {error && <span className="text-down">{error}</span>}
      <span className="ml-auto">Play money: 1 $RIALO is 1 USD. Not financial advice.</span>
    </div>
  );
}

const FILTERS: ("all" | LiveCategory)[] = ["all", "crypto", "stock", "commodity", "income"];

export function LiveDashboard({ data }: { data: LiveData }) {
  const [selected, setSelected] = useState("BTC");
  return (
    <div className="grid gap-3 lg:h-[calc(100dvh-260px)] lg:min-h-[560px] lg:grid-cols-[300px_minmax(0,1fr)_320px]">
      <LiveCommand data={data} selected={selected} />
      <LiveMarketTable data={data} selected={selected} onSelect={setSelected} />
      <NewsFeed />
    </div>
  );
}

function LiveCommand({ data, selected }: { data: LiveData; selected: string }) {
  const live = useLive();
  const threshold = useGame((s) => s.mfaThreshold);
  const gate = useMfaGate();
  const toast = useToast();
  const [amount, setAmount] = useState(100);
  const asset = LIVE_BY_ID[selected];
  const quote = data.quotes[selected];
  const nw = liveNetWorth(live, data.quotes);
  const pnl = nw - LIVE_GRANT;
  const held = live.holdings[selected];
  const heldValue = held && quote ? held.qty * quote.price : 0;
  const closed = !tradesAroundTheClock(asset) && data.market && !data.market.usMarketOpen;
  const sellValue = Math.min(amount, heldValue);
  const gated = sellNeedsMfa(sellValue, threshold);

  const guard = () => {
    if (!quote) return "Waiting for a price…";
    if (closed) return "The US market is closed. Stocks and ETFs trade 9:30 to 16:00 New York time.";
    return null;
  };
  const doBuy = () => {
    const why = guard();
    if (why) return toast(why, "error");
    const r = live.buy(selected, amount, quote!);
    toast(r.message, r.ok ? "ok" : "error");
  };
  const doSell = async () => {
    const why = guard();
    if (why) return toast(why, "error");
    if (gated && !(await gate.require("large-sell"))) return toast("Large sell cancelled. 2FA was not completed.", "error");
    const r = useLive.getState().sell(selected, amount, data.quotes[selected] ?? quote!);
    toast(r.message, r.ok ? "ok" : "error");
  };

  return (
    <Panel title="Order" right={<LivePricesBadge quotes={data.quotes} />}>
      <div className="flex h-full flex-col gap-4">
        <div>
          <p className="text-xs text-muted">Live account net worth</p>
          <p className="whitespace-nowrap text-[40px] font-semibold leading-none tracking-[-0.03em]">
            <AnimatedNumber value={nw} /> <span className="text-sm font-normal tracking-normal text-muted">$RIALO</span>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-panel bg-panel-2 p-2.5">
              <p className="text-[11px] text-muted">Cash</p>
              <AnimatedNumber value={live.cash} className="font-semibold" />
            </div>
            <div className="rounded-panel bg-panel-2 p-2.5">
              <p className="text-[11px] text-muted">P&amp;L since start</p>
              <span className={`tabular font-semibold ${pnl >= 0 ? "text-up" : "text-down"}`}>
                {pnl >= 0 ? "+" : ""}
                {fmt(pnl)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-panel border border-line p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-2">
              <LiveAssetIcon id={asset.id} category={asset.category} className="h-5 w-5 text-gold" />
              <span className="font-semibold tracking-tight text-2xl leading-none">{asset.name}</span>
            </span>
            <span className="text-right">
              <span className="tabular block text-sm font-medium">{quote ? fmtPrice(quote.price) : "Loading"}</span>
              {quote && <Delta value={quote.change} className="text-[11px]" />}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {CATEGORY_LABEL[asset.category]}
            {asset.proxy && <>. {asset.proxy}</>}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {quote && <SourceBadge source={quote.source} />}
            {quote && <span className="text-[10px] text-muted">{ago(quote.asOf)}</span>}
            {closed && <Badge tone="muted">Market closed</Badge>}
          </div>
          <p className="mt-2 text-xs text-muted">
            Holding {held ? `${fmt(heldValue)} $RIALO` : "none"}
          </p>
          <label className="mt-3 block text-xs text-muted" htmlFor="live-amount">
            Order size ($RIALO)
          </label>
          <div className="mt-1 flex gap-1.5">
            <input
              id="live-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="tabular w-full rounded-control border border-line bg-black/30 px-2.5 py-1.5 outline-none focus:border-gold"
            />
            {[50, 100, 500].map((v) => (
              <button key={v} onClick={() => setAmount(v)} className={`rounded-control border px-2 text-xs ${amount === v ? "border-gold text-gold" : "border-line text-muted"}`}>
                {v}
              </button>
            ))}
          </div>
          {gated && heldValue > 0 && <p className="mt-2 text-xs text-gold">Selling more than {fmt(threshold, 0)} $RIALO needs 2FA</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <motion.button whileTap={{ scale: 0.96 }} onClick={doBuy} className="rounded-control bg-up py-2.5 font-semibold text-black">
              Buy
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={doSell} disabled={!held} className="rounded-control bg-down py-2.5 font-semibold text-white disabled:opacity-40">
              Sell
            </motion.button>
          </div>
          {held && (
            <button onClick={() => setAmount(Math.floor(heldValue * 100) / 100)} className="mt-2 text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
              Use full position ({fmt(heldValue)})
            </button>
          )}
        </div>
        <p className="mt-auto text-[11px] leading-relaxed text-muted">
          Live Market uses real prices with play money. On Rialo, these quotes would arrive through native HTTPS calls instead of a server.
        </p>
      </div>
    </Panel>
  );
}

function LiveMarketTable({ data, selected, onSelect }: { data: LiveData; selected: string; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = useState("");
  const holdings = useLive((s) => s.holdings);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return LIVE_ASSETS.filter((a) => (filter === "all" || a.category === filter) && (!term || a.name.toLowerCase().includes(term) || a.ticker.toLowerCase().includes(term)));
  }, [filter, q]);

  return (
    <Panel
      title="Market Live"
      right={<span className="text-[11px] text-muted">{data.market ? `Snapshot ${ago(data.market.updatedAt)}` : "Loading…"}</span>}
      className="overflow-hidden"
    >
      <div className="-mt-1 mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink"}`}
          >
            {f === "all" ? `All (${LIVE_ASSETS.length})` : CATEGORY_LABEL[f]}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          aria-label="Search assets"
          className="ml-auto w-full rounded-control border border-line bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-gold sm:w-44"
        />
      </div>
      <div className="h-full overflow-auto pb-10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-panel text-left text-xs text-muted">
            <tr>
              <th className="pb-2 font-medium">Asset</th>
              <th className="pb-2 text-right font-medium">Price (USD)</th>
              <th className="pb-2 text-right font-medium">Change</th>
              <th className="hidden pb-2 pl-4 font-medium md:table-cell">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const quote = data.quotes[a.id];
              const owned = (holdings[a.id]?.qty ?? 0) > 0;
              return (
                <tr
                  key={a.id}
                  onClick={() => onSelect(a.id)}
                  aria-selected={selected === a.id}
                  className={`cursor-pointer border-t border-line transition ${selected === a.id ? "bg-panel-2" : "hover:bg-panel-2"}`}
                >
                  <td className="py-2.5 pr-2">
                    <button className="flex items-center gap-2.5 text-left" onClick={() => onSelect(a.id)}>
                      <LiveAssetIcon id={a.id} category={a.category} className="h-5 w-5 shrink-0 text-gold/80" />
                      <span>
                        <span className="font-medium">{a.name}</span>
                        <span className="ml-1.5 font-mono text-[10px] text-muted">{a.ticker}</span>
                      </span>
                      {owned && <Badge tone="up">Owned</Badge>}
                    </button>
                  </td>
                  <td className="text-right">{quote ? <FlashPrice value={quote.price} /> : <span className="text-muted">Loading</span>}</td>
                  <td className="text-right">{quote ? <Delta value={quote.change} className="text-xs" /> : null}</td>
                  <td className="hidden pl-4 md:table-cell">{quote && <SourceBadge source={quote.source} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-6 text-center text-sm text-muted">No assets match “{q}”.</p>}
        <p className="mt-3 text-[11px] text-muted">
          Crypto change is over 24 hours; stocks and ETFs versus the previous close. Commodities and income assets are tracked through the ETFs
          named on each asset. Quotes can be delayed by the provider.
        </p>
      </div>
    </Panel>
  );
}

function NewsFeed() {
  const news = useMarketNews();
  const trades = useLive((s) => s.trades);
  return (
    <Panel title="Market News" right={<span className="text-[11px] text-muted">Source: Finnhub</span>} className="overflow-hidden">
      <ul className="h-full space-y-2 overflow-auto pr-1 max-lg:max-h-[420px]">
        {trades.slice(0, 3).map((t) => (
          <li key={t.id} className="rounded-panel border border-line bg-panel-2 p-3">
            <p className="text-xs text-faint">Your trade</p>
            <p className="mt-1 text-sm">{t.text}</p>
          </li>
        ))}
        {!news && <li className="text-sm text-muted">Loading news…</li>}
        {news && !news.configured && (
          <li className="rounded-panel border border-line bg-panel-2 p-3 text-sm text-muted">
            Add a <code className="text-gold">FINNHUB_API_KEY</code> on the server to show live market headlines here.
          </li>
        )}
        {news?.items.map((n) => (
          <li key={n.id} className="rounded-panel border border-line bg-panel-2 p-3">
            <p className="text-xs text-faint">
              {new Date(n.datetime * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {n.source.toUpperCase()}
            </p>
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium hover:text-gold">
              {n.headline}
            </a>
          </li>
        ))}
        {news?.configured && news.items.length === 0 && <li className="text-sm text-muted">No headlines right now.</li>}
      </ul>
    </Panel>
  );
}

export function LivePortfolio({ data }: { data: LiveData }) {
  const live = useLive();
  const toast = useToast();
  const entries = Object.entries(live.holdings);
  const nw = liveNetWorth(live, data.quotes);
  return (
    <Panel
      title="Live portfolio"
      right={
        <button
          onClick={() => {
            if (confirm("Reset your Live account to 10,000 $RIALO and clear all positions?")) {
              live.reset();
              toast("Live account reset.", "info");
            }
          }}
          className="text-[11px] text-muted hover:text-ink"
        >
          Reset account
        </button>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Net worth <span className="tabular text-ink">{fmt(nw)} $RIALO</span>, cash <span className="tabular text-ink">{fmt(live.cash)}</span>, return{" "}
        <span className={nw >= LIVE_GRANT ? "text-up" : "text-down"}>{(((nw - LIVE_GRANT) / LIVE_GRANT) * 100).toFixed(2)}%</span>
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">No live positions yet. Buy from the Markets tab.</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Asset</th>
                <th className="pb-2 text-right font-medium">Units</th>
                <th className="pb-2 text-right font-medium">Avg cost</th>
                <th className="pb-2 text-right font-medium">Value</th>
                <th className="pb-2 text-right font-medium">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([id, h]) => {
                const a = LIVE_BY_ID[id];
                const price = data.quotes[id]?.price ?? 0;
                const value = h.qty * price;
                const pnl = value - h.cost;
                return (
                  <tr key={id} className="border-t border-line">
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        <LiveAssetIcon id={id} category={a.category} className="h-4 w-4 text-gold" />
                        {a.name} <Badge tone="up">Owned</Badge>
                      </span>
                    </td>
                    <td className="tabular text-right">{h.qty.toLocaleString("en-US", { maximumFractionDigits: 6 })}</td>
                    <td className="tabular text-right">{fmtPrice(h.cost / h.qty)}</td>
                    <td className="tabular text-right">{fmt(value)}</td>
                    <td className={`tabular text-right ${pnl >= 0 ? "text-up" : "text-down"}`}>
                      {pnl >= 0 ? "+" : ""}
                      {fmt(pnl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
