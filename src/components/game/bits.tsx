"use client";

import { Rolling } from "@/components/ui/Rolling";
import { Badge, Modal } from "@/components/ui/Modal";
import { RIALO_MAPPING } from "@/components/landing/Landing";
import { fmt } from "@/lib/game/store";
import { NET_WORTH_TARGET, TIERS } from "@/lib/game/data";
import { rialo } from "@/lib/rialo/adapter";

/** Balances roll digit by digit like the quote board (DESIGN.md). */
export function AnimatedNumber({ value, decimals = 2, className = "" }: { value: number; decimals?: number; className?: string }) {
  return <Rolling value={value} format={(n) => fmt(n, decimals)} className={className} />;
}

export function SimBadge() {
  return <Badge tone="warn">Simulation</Badge>;
}

export function Panel({ title, right, children, className = "" }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-panel border border-line bg-panel ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-medium text-muted">{title}</h2>
        {right}
      </header>
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </section>
  );
}

export function tierFor(netWorth: number) {
  let idx = 0;
  TIERS.forEach((t, i) => netWorth >= t.minNetWorth && (idx = i));
  const tier = TIERS[idx];
  const next = TIERS[idx + 1];
  const pct = next ? Math.min(1, (netWorth - tier.minNetWorth) / (next.minNetWorth - tier.minNetWorth)) : 1;
  return { tier, next, pct };
}

/** Net worth target + Tycoon tier progress. Always visible in the game. */
export function TargetBar({ netWorth }: { netWorth: number }) {
  const { tier, next, pct } = tierFor(netWorth);
  const toTarget = Math.min(1, netWorth / NET_WORTH_TARGET);
  return (
    <div className="grid gap-3 rounded-panel border border-line bg-panel px-4 py-3 md:grid-cols-2 md:gap-6">
      <div>
        <div className="flex justify-between text-xs text-muted">
          <span>
            Target: <span className="text-ink">{fmt(NET_WORTH_TARGET, 0)} $RIALO</span>
          </span>
          <span className="tabular">{(toTarget * 100).toFixed(1)}%</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gold transition-[width] duration-[600ms] ease-[var(--ease-board)]" style={{ width: `${toTarget * 100}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-muted">
          <span>
            Tier: <span className="font-semibold text-gold">{tier.name}</span>
            {next && <> → {next.name} at {fmt(next.minNetWorth, 0)}</>}
          </span>
          <span className="tabular">{next ? `${(pct * 100).toFixed(0)}%` : "Max tier"}</span>
        </div>
        <div className="mt-1.5 flex gap-1">
          {TIERS.map((t) => (
            <div key={t.name} className={`h-2 flex-1 rounded-full ${netWorth >= t.minNetWorth ? "bg-gold" : "bg-white/10"}`} title={t.name} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RialoInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="How this would run on Rialo">
      <div className="space-y-3 text-sm">
        <p className="text-muted">
          Adapter: <span className="text-gold">{rialo.mode}</span> ({rialo.networkLabel}). Every Simulation Season price and every balance is a
          local simulation until the Rialo devnet is verified live.
        </p>
        <ul className="space-y-2">
          {RIALO_MAPPING.map((m) => (
            <li key={m.mechanic} className="rounded-panel border border-line p-3">
              <p>
                <span className="font-semibold">{m.mechanic}</span> <span className="text-gold">→ {m.feature}</span>
              </p>
              <p className="text-xs text-muted">{m.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
