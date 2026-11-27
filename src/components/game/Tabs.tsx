"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Modal";
import { AssetIcon, VaultIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toasts";
import { useAuth } from "@/lib/auth/context";
import { ASSET_BY_ID, ASSET_CLASSES, RARE_ITEM, STARTING_GRANT, type AssetId } from "@/lib/game/data";
import { fmt, netWorthOf, useGame } from "@/lib/game/store";
import { useMfaGate } from "@/lib/mfa/gate";
import { Panel, SimBadge } from "./bits";

const PAY_TO_WIN_NOTE = "Fair play: items are cosmetic plus a small buff only. Nothing can be bought that decides the leaderboard.";

export function PortfolioTab() {
  const s = useGame();
  const gate = useMfaGate();
  const toast = useToast();
  const entries = Object.entries(s.holdings) as [AssetId, { qty: number; cost: number }][];

  const withdraw = async () => {
    if (!(await gate.require("withdraw"))) return toast("Withdraw cancelled. 2FA was not completed.", "error");
    toast("2FA passed. Withdrawals are disabled until the Rialo devnet is verified (simulation).", "info");
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Panel title="Portfolio" right={<SimBadge />}>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">You don&apos;t own any assets yet. Buy from the Dashboard.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {entries.map(([id, h]) => {
              const a = ASSET_BY_ID[id];
              const value = h.qty * s.prices[id];
              const pnl = value - h.cost;
              const cls = ASSET_CLASSES[a.classId];
              return (
                <div key={id} className="rounded-panel border border-line bg-panel-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      <span className="inline-flex items-center gap-2"><AssetIcon id={a.id} className="h-5 w-5 text-gold" /><span className="font-semibold tracking-tight text-2xl font-normal leading-none">{a.name}</span></span>
                    </span>
                    <Badge tone="up">Owned</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-muted">Units</dt>
                    <dd className="tabular text-right">{h.qty}</dd>
                    <dt className="text-muted">Avg cost</dt>
                    <dd className="tabular text-right">{fmt(h.cost / h.qty)}</dd>
                    <dt className="text-muted">Value</dt>
                    <dd className="tabular text-right">{fmt(value)}</dd>
                    <dt className="text-muted">P&amp;L</dt>
                    <dd className={`tabular text-right ${pnl >= 0 ? "text-up" : "text-down"}`}>
                      {pnl >= 0 ? "+" : ""}
                      {fmt(pnl)}
                    </dd>
                    <dt className="text-muted">Yield / cycle</dt>
                    <dd className="tabular text-right">{(cls.yieldPerCycle * 100).toFixed(1)}%</dd>
                  </dl>
                  <p className="mt-2 text-[11px] text-muted">
                    {cls.name}, {cls.risk.toLowerCase()} risk
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <div className="space-y-3">
        <Panel title="Wallet">
          <div className="space-y-3 text-sm">
            <p>
              Cash <span className="tabular float-right font-semibold">{fmt(s.cash)} $RIALO</span>
            </p>
            <p>
              Bid escrow <span className="tabular float-right">{fmt(s.auction.myBid)} $RIALO</span>
            </p>
            <p className="font-mono text-xs text-muted break-all">{s.address}</p>
            <button onClick={withdraw} className="w-full rounded-control border border-line py-2.5 hover:border-gold">
              Withdraw (2FA)
            </button>
          </div>
        </Panel>
        <Panel title="Items">
          {s.items.includes(RARE_ITEM.id) ? (
            <div className="rounded-panel border border-gold/40 bg-gold/10 p-3 text-sm">
              <p className="font-semibold text-gold">{RARE_ITEM.name}</p>
              <p className="text-xs text-muted">{RARE_ITEM.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted">No items yet. Win one in the Auction.</p>
          )}
          <p className="mt-3 text-[11px] text-muted">{PAY_TO_WIN_NOTE}</p>
        </Panel>
      </div>
    </div>
  );
}

function useNow(ms = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function AuctionTab() {
  const auction = useGame((s) => s.auction);
  const cash = useGame((s) => s.cash);
  const placeBid = useGame((s) => s.placeBid);
  const settle = useGame((s) => s.settleAuction);
  const gate = useMfaGate();
  const toast = useToast();
  const now = useNow();
  const left = Math.max(0, auction.endsAt - now);
  const minBid = Math.max(RARE_ITEM.minBid, auction.myBid + RARE_ITEM.bidStep);
  const [amount, setAmount] = useState(minBid);
  const sealed = auction.rivalBids.filter((b) => b.at <= now).length + (auction.myBid > 0 ? 1 : 0);

  useEffect(() => {
    if (left === 0) void settle();
  }, [left, settle]);
  useEffect(() => setAmount((a) => Math.max(a, minBid)), [minBid]);

  const bid = async () => {
    if (!(await gate.require("auction-bid"))) return toast("Bid cancelled. 2FA was not completed.", "error");
    const r = placeBid(amount);
    toast(r.message, r.ok ? "ok" : "error");
  };

  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title={`Auction, round ${auction.round}`} right={<SimBadge />}>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="grid aspect-square place-items-center rounded-panel border border-gold/40 bg-gradient-to-br from-gold/30 via-panel-2 to-panel-2 text-7xl"><VaultIcon className="h-28 w-28 text-gold" /></div>
          <div>
            <Badge>Rare item: cosmetic plus a small buff</Badge>
            <h3 className="mt-3 font-semibold tracking-tight text-4xl leading-none">{RARE_ITEM.name}</h3>
            <p className="mt-1 text-sm text-muted">{RARE_ITEM.description}</p>
            <div className="mt-5 flex items-end gap-6">
              <div>
                <p className="text-xs text-muted">Ends in</p>
                <p className={`tabular text-5xl font-semibold tracking-tight ${left < 30000 ? "text-down" : "text-gold"}`} aria-live="off">
                  {mm}:{ss}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Sealed bids</p>
                <p className="tabular text-2xl font-semibold">{sealed}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Your bid</p>
                <p className="tabular text-2xl font-semibold">{auction.myBid ? fmt(auction.myBid, 0) : "None"}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <input
                type="number"
                min={minBid}
                step={RARE_ITEM.bidStep}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                aria-label="Bid amount"
                className="tabular w-40 rounded-control border border-line bg-black/30 px-3 py-2.5 outline-none focus:border-gold"
              />
              <button onClick={bid} disabled={left === 0} className="rounded-control bg-gold px-6 py-2.5 font-semibold text-black disabled:opacity-50">
                {auction.myBid ? "Raise bid (2FA)" : "Bid (2FA)"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Minimum {fmt(minBid, 0)} $RIALO. Your bid is escrowed from cash ({fmt(cash)} available) and refunded if you lose.
            </p>
          </div>
        </div>
      </Panel>
      <div className="space-y-3">
        <Panel title="Confidential bidding">
          <p className="text-sm text-muted">
            Bids are sealed: nobody sees amounts until the reveal. On Rialo, bids would be processed inside a TEE (confidential
            execution) and ties broken by TEE randomness, so the result is verifiably fair. Here, the reveal is simulated by the mock
            adapter.
          </p>
          <p className="mt-3 text-[11px] text-muted">{PAY_TO_WIN_NOTE}</p>
        </Panel>
        <Panel title="Last result">
          {auction.lastResult ? (
            <p className="text-sm">
              Round {auction.lastResult.round}:{" "}
              <span className={auction.lastResult.youWon ? "text-up" : "text-ink"}>{auction.lastResult.youWon ? "You" : auction.lastResult.winner}</span> won
              for {fmt(auction.lastResult.amount, 0)} $RIALO
            </p>
          ) : (
            <p className="text-sm text-muted">No round has been revealed yet.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function LeaderboardTab() {
  const s = useGame();
  const { user } = useAuth();
  const me = netWorthOf(s);
  const rows = [
    { name: `${user?.name ?? "You"} (you)`, netWorth: me, you: true },
    ...s.rivals.map((r) => ({ name: r.name, netWorth: r.netWorth, you: false })),
  ]
    .map((r) => ({ ...r, roc: (r.netWorth - STARTING_GRANT) / STARTING_GRANT }))
    .sort((a, b) => b.roc - a.roc);

  return (
    <section className="rounded-panel border border-line bg-panel">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-semibold tracking-tight text-4xl leading-none">Season leaderboard</h2>
          <p className="text-sm text-muted">Season 1 leaderboard · return on capital</p>
        </div>
        <SimBadge />
      </header>
      <ol>
        {rows.map((r, i) => (
          <li key={r.name} className={`grid grid-cols-[40px_1fr_auto_auto] items-center gap-4 border-b border-line px-5 py-3 last:border-0 ${r.you ? "bg-gold/10" : ""}`}>
            <span className={`tabular font-medium ${i === 0 ? "text-gold" : "text-muted"}`}>{i + 1}</span>
            <span className={r.you ? "font-semibold text-gold" : ""}>{r.name}</span>
            <span className="tabular text-sm text-muted">{fmt(r.netWorth)} $RIALO</span>
            <span className={`tabular w-20 text-right font-semibold ${r.roc >= 0 ? "text-up" : "text-down"}`}>
              {r.roc >= 0 ? "+" : ""}
              {(r.roc * 100).toFixed(2)}%
            </span>
          </li>
        ))}
      </ol>
      <p className="px-5 py-3 text-[11px] text-muted">Everyone starts with {fmt(STARTING_GRANT, 0)} $RIALO. Ranked by return on that capital.</p>
    </section>
  );
}
