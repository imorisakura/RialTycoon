"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Badge } from "@/components/ui/Modal";
import { AssetIcon, SourceIcon } from "@/components/ui/Icons";
import { Delta, Sparkline } from "@/components/ui/Sparkline";
import { useToast } from "@/components/ui/Toasts";
import { ASSETS, ASSET_BY_ID, ASSET_CLASSES, type AssetId } from "@/lib/game/data";
import { fmt, netWorthOf, useGame, type FeedEntry } from "@/lib/game/store";
import { useMfaGate } from "@/lib/mfa/gate";
import { sellNeedsMfa } from "@/lib/mfa/policy";
import { AnimatedNumber, Panel, SimBadge } from "./bits";

const prevOf = (history: number[]) => history[history.length - 2] ?? history[history.length - 1];

export function Dashboard({ onOpenInfo }: { onOpenInfo: () => void }) {
  const [selected, setSelected] = useState<AssetId>("GOLD");
  return (
    <div className="grid gap-3 lg:h-[calc(100dvh-210px)] lg:min-h-[560px] lg:grid-cols-[300px_minmax(0,1fr)_320px]">
      <Command selected={selected} />
      <MarketLive selected={selected} onSelect={setSelected} />
      <WorldEvents onOpenInfo={onOpenInfo} />
    </div>
  );
}

function Command({ selected }: { selected: AssetId }) {
  const s = useGame();
  const netWorth = netWorthOf(s);
  const pnl = netWorth - s.cycleStartNetWorth;
  const toast = useToast();
  const gate = useMfaGate();
  const [qty, setQty] = useState(1);
  const asset = ASSET_BY_ID[selected];
  const price = s.prices[selected];
  const held = s.holdings[selected]?.qty ?? 0;
  const value = price * qty;
  const sellGated = sellNeedsMfa(value, s.mfaThreshold);

  const doBuy = () => {
    const r = s.buy(selected, qty);
    toast(r.message, r.ok ? "ok" : "error");
  };
  const doSell = async () => {
    if (sellGated && !(await gate.require("large-sell"))) return toast("Large sell cancelled — 2FA not completed.", "error");
    const r = useGame.getState().sell(selected, qty);
    toast(r.message, r.ok ? "ok" : "error");
  };
  const doCycle = async () => {
    await s.nextCycle();
    const g = useGame.getState();
    const ev = g.feed.find((f) => f.kind === "event");
    toast(`Cycle ${g.cycle}: ${ev?.title ?? "markets moved"}`, "info");
  };

  return (
    <Panel title="Command" right={<SimBadge />}>
      <div className="flex h-full flex-col gap-4">
        <div>
          <p className="text-xs text-muted">Net worth</p>
          <p className="font-display text-5xl leading-none">
            <AnimatedNumber value={netWorth} /> <span className="text-sm font-normal text-muted">$RIALO</span>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/5 p-2.5">
              <p className="text-[11px] text-muted">Cash</p>
              <AnimatedNumber value={s.cash} className="font-semibold" />
            </div>
            <div className="rounded-xl bg-white/5 p-2.5">
              <p className="text-[11px] text-muted">Today&apos;s P&amp;L (this cycle)</p>
              <span className={`tabular font-semibold ${pnl >= 0 ? "text-up" : "text-down"}`}>
                {pnl >= 0 ? "+" : ""}
                {fmt(pnl)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              <span className="inline-flex items-center gap-2"><AssetIcon id={asset.id} className="h-5 w-5 text-gold" /><span className="font-display text-2xl font-normal leading-none">{asset.name}</span></span>
            </p>
            <span className="tabular text-sm">{fmt(price)}</span>
          </div>
          <p className="text-xs text-muted">
            Holding {held} · {ASSET_CLASSES[asset.classId].name}
          </p>
          <label className="mt-3 block text-xs text-muted" htmlFor="qty">
            Quantity
          </label>
          <div className="mt-1 flex gap-1.5">
            <input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="tabular w-full rounded-lg border border-line bg-black/30 px-2.5 py-1.5 outline-none focus:border-gold"
            />
            {[1, 5, 10].map((n) => (
              <button key={n} onClick={() => setQty(n)} className={`rounded-lg border px-2.5 text-xs ${qty === n ? "border-gold text-gold" : "border-line text-muted"}`}>
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Order value <span className="tabular text-ink">{fmt(value)}</span> $RIALO
            {sellGated && held > 0 && <span className="text-amber-300"> · selling needs 2FA</span>}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <motion.button whileTap={{ scale: 0.96 }} onClick={doBuy} className="rounded-xl bg-up py-2.5 font-semibold text-black">
              Buy
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={doSell} disabled={held === 0} className="rounded-xl bg-down py-2.5 font-semibold text-white disabled:opacity-40">
              Sell
            </motion.button>
          </div>
        </div>

        <div className="mt-auto">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={doCycle}
            disabled={s.busy}
            className="w-full rounded-xl border border-gold/50 bg-gold/10 py-3 font-semibold text-gold hover:bg-gold/20 disabled:opacity-60"
          >
            Next cycle → <span className="text-xs font-normal text-muted">(now cycle {s.cycle})</span>
          </motion.button>
          <p className="mt-1.5 text-center text-[11px] text-muted">Advances the market: events fire, prices move, yield pays.</p>
        </div>
      </div>
    </Panel>
  );
}

function MarketLive({ selected, onSelect }: { selected: AssetId; onSelect: (id: AssetId) => void }) {
  const prices = useGame((s) => s.prices);
  const history = useGame((s) => s.history);
  const holdings = useGame((s) => s.holdings);
  const cycle = useGame((s) => s.cycle);

  return (
    <Panel title="Market Live" right={<span className="text-[11px] text-muted">Cycle {cycle} · <span className="text-amber-300">SIMULATION</span></span>} className="overflow-hidden">
      <div className="-mx-4 -mt-4 mb-3 overflow-hidden border-b border-line bg-black/20 py-1.5">
        <div className="marquee flex w-max gap-6 whitespace-nowrap text-xs">
          {[...ASSETS, ...ASSETS].map((a, i) => (
            <span key={i} className="flex gap-1.5" aria-hidden={i >= ASSETS.length}>
              <span className="font-mono text-muted">{a.ticker}</span>
              <span className="tabular">{fmt(prices[a.id])}</span>
              <Delta value={prices[a.id] / prevOf(history[a.id]) - 1} />
            </span>
          ))}
        </div>
      </div>
      <div className="h-full overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="pb-2 font-medium">Asset</th>
              <th className="hidden pb-2 font-medium md:table-cell">Class</th>
              <th className="pb-2 text-right font-medium">Price</th>
              <th className="pb-2 text-right font-medium">Change</th>
              <th className="hidden pb-2 pl-3 font-medium sm:table-cell">Trend</th>
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((a) => {
              const change = prices[a.id] / prevOf(history[a.id]) - 1;
              const heat = Math.min(0.16, Math.abs(change) * 3);
              const owned = (holdings[a.id]?.qty ?? 0) > 0;
              return (
                <tr
                  key={a.id}
                  onClick={() => onSelect(a.id)}
                  aria-selected={selected === a.id}
                  className={`cursor-pointer border-t border-line transition ${selected === a.id ? "outline outline-1 -outline-offset-1 outline-gold/60" : "hover:bg-white/5"}`}
                  style={{ backgroundColor: change >= 0 ? `rgba(34,197,94,${heat})` : `rgba(239,68,68,${heat})` }}
                >
                  <td className="py-2.5 pr-2">
                    <button className="flex items-center gap-2 text-left" onClick={() => onSelect(a.id)}>
                      <AssetIcon id={a.id} className="h-5 w-5 shrink-0 text-gold/80" />
                      <span>
                        <span className="font-medium">{a.name}</span>
                        <span className="ml-1.5 font-mono text-[10px] text-muted">{a.ticker}</span>
                      </span>
                      {owned && <Badge tone="up">Owned</Badge>}
                    </button>
                  </td>
                  <td className="hidden text-xs text-muted md:table-cell">{ASSET_CLASSES[a.classId].name}</td>
                  <td className="text-right"><PriceCell value={prices[a.id]} /></td>
                  <td className="text-right">
                    <Delta value={change} className="text-xs" />
                  </td>
                  <td className="hidden pl-3 sm:table-cell">
                    <Sparkline points={history[a.id]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-muted">Prices are a local simulation, not live market data. Change is versus the previous cycle.</p>
      </div>
    </Panel>
  );
}


function WorldEvents({ onOpenInfo }: { onOpenInfo: () => void }) {
  const feed = useGame((s) => s.feed);
  return (
    <Panel
      title="World Events"
      right={
        <button onClick={onOpenInfo} className="text-[11px] text-gold hover:underline">
          Powered by reactivity →
        </button>
      }
      className="overflow-hidden"
    >
      <ul className="h-full space-y-2 overflow-auto pr-1 max-lg:max-h-[420px]" aria-live="polite">
        <AnimatePresence initial={false}>
          {feed.map((f) => (
            <motion.li key={f.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border p-3 ${kindStyle(f)}`}>
              <p className="font-mono text-[10px] tracking-wider text-muted">{f.header}</p>
              <p className="mt-1 text-sm font-medium">
                {f.source && <SourceIcon source={f.source} className="mr-1.5 inline h-4 w-4 -translate-y-px text-gold" />}
                {f.title}
              </p>
              {f.source && <p className="text-[11px] text-gold">{f.source}</p>}
              {f.detail && <p className="mt-1 text-xs text-muted">{f.detail}</p>}
            </motion.li>
          ))}
        </AnimatePresence>
        {feed.length === 0 && <li className="text-sm text-muted">Press “Next cycle” to start the world.</li>}
      </ul>
    </Panel>
  );
}

const kindStyle = (f: FeedEntry) =>
  f.kind === "event" ? "border-gold/30 bg-gold/5" : f.kind === "yield" ? "border-up/30 bg-up/5" : f.kind === "auction" ? "border-purple-400/30 bg-purple-400/5" : "border-line bg-white/[0.02]";

/** Price cell that flashes gold whenever the price changes. */
function PriceCell({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ backgroundColor: "rgba(232,184,74,0.35)" }}
      animate={{ backgroundColor: "rgba(232,184,74,0)" }}
      transition={{ duration: 1.2 }}
      className="tabular rounded px-1.5 py-0.5 font-mono font-medium"
    >
      {fmt(value)}
    </motion.span>
  );
}
