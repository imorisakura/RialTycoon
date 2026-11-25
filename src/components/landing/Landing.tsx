"use client";

import { GoogleButton } from "@/components/ui/GoogleButton";
import { Badge } from "@/components/ui/Modal";
import { Delta, Sparkline } from "@/components/ui/Sparkline";
import { useDemoPrices, type DemoQuote } from "./useDemoPrices";

export const RIALO_MAPPING = [
  { mechanic: "Live prices", feature: "Native HTTPS calls", detail: "Contracts read price APIs directly — no third-party oracle." },
  { mechanic: "World events", feature: "Reactivity", detail: "ON / EVERY triggers react to events — no keeper bots." },
  { mechanic: "Auctions & loot fairness", feature: "TEE randomness", detail: "Sealed bids and fair draws in confidential execution." },
  { mechanic: "Yield & cycle timing", feature: "Scheduled transactions", detail: "On-chain timers pay yield and advance cycles." },
  { mechanic: "Google identity", feature: "Rialo Identity", detail: "Your Google sign-in maps to an on-chain identity." },
];

const NAV = [
  { href: "#markets", label: "Markets" },
  { href: "#how", label: "How to play" },
  { href: "#why-rialo", label: "Why Rialo" },
];

export function Landing() {
  const quotes = useDemoPrices();
  return (
    <div id="landing" className="relative">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <a href="#landing" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-gold-bright to-gold-deep text-sm font-black text-black">R</span>
            <span>
              Rial<span className="text-gold">Tycoon</span>
            </span>
          </a>
          <nav className="hidden gap-6 text-sm text-muted md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <GoogleButton size="sm" />
        </div>
      </header>

      <Ticker quotes={quotes} />

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:px-8 md:py-24">
        <div>
          <Badge>Built for Rialo · Devnet preview</Badge>
          <h1 className="mt-5 text-4xl font-bold leading-tight md:text-6xl">
            Own real-world assets. <span className="gold-text">Play it like a tycoon.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Gold, oil, the S&amp;P 500 and Jakarta CBD property — tokenized, tradable and moved by world events. Grow 10,000 $RIALO
            into a 25,000 empire.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <GoogleButton size="lg" />
            <span className="text-sm text-muted">No wallet extension. No seed phrase.</span>
          </div>
        </div>
        <MarketPanel quotes={quotes} />
      </section>

      <section aria-label="Stats" className="border-y border-line bg-panel/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-8">
          {[
            ["8", "Tradable RWA assets"],
            ["14", "World events that move prices"],
            ["10,000", "$RIALO starting grant"],
            ["25,000", "Net worth to reach Tycoon"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="tabular text-3xl font-bold text-gold">{v}</p>
              <p className="text-sm text-muted">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="markets" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-bold md:text-4xl">Featured assets</h2>
          <Badge tone="warn">Demo prices · simulation</Badge>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quotes
            .filter((q) => ["GOLD", "OIL", "SPX", "SCBD"].includes(q.id))
            .map((q) => (
              <div key={q.id} className="rounded-2xl border border-line bg-panel p-5 transition hover:border-gold/50">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{q.icon}</span>
                  <span className="font-mono text-xs text-muted">{q.ticker}</span>
                </div>
                <p className="mt-4 font-semibold">{q.name}</p>
                <p className="tabular mt-1 text-2xl font-bold">{q.price.toFixed(2)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Delta value={q.change} className="text-sm" />
                  <Sparkline points={q.points} />
                </div>
              </div>
            ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-8">
        <h2 className="text-3xl font-bold md:text-4xl">How to play</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Sign in with Google", "An embedded wallet is created for you and you receive 10,000 $RIALO on devnet (simulated)."],
            ["Read the world, trade the market", "Each cycle, world events move prices. Buy what benefits, sell what doesn't, and collect yield."],
            ["Climb the Tycoon tiers", "Grow your net worth to 25,000 $RIALO and top the season leaderboard by return on capital."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-line bg-panel p-6">
              <span className="font-mono text-gold">0{i + 1}</span>
              <p className="mt-3 text-lg font-semibold">{t}</p>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="why-rialo" className="scroll-mt-20 border-y border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <h2 className="text-3xl font-bold md:text-4xl">Why Rialo</h2>
          <p className="mt-3 max-w-2xl text-muted">
            Rialo is its own SVM-compatible Layer 1 by Subzero Labs. Each game mechanic maps to a Rialo-native feature that would power
            it for real. Today every price and balance is a local simulation.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-line">
            {RIALO_MAPPING.map((m) => (
              <div key={m.mechanic} className="grid gap-1 border-b border-line bg-panel px-5 py-4 last:border-b-0 md:grid-cols-[1fr_auto_1fr_2fr] md:items-center md:gap-4">
                <span className="font-semibold">{m.mechanic}</span>
                <span className="hidden text-gold md:block">→</span>
                <span className="text-gold">{m.feature}</span>
                <span className="text-sm text-muted">{m.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/15 via-panel to-panel p-8 md:flex-row md:items-center md:p-12">
          <div>
            <h2 className="text-3xl font-bold">Start your empire in one click.</h2>
            <p className="mt-2 text-muted">Google sign-in. Secure embedded wallet. 2FA only when it matters.</p>
          </div>
          <GoogleButton size="lg" />
        </div>
      </section>

      <footer className="border-t border-line pb-28 pt-10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-4 text-sm text-muted md:flex-row md:px-8">
          <p>
            <span className="text-ink">RialTycoon</span> · rialtycoon.rialo.app
          </p>
          <p>All prices and balances are simulated. Not financial advice. Built for the Rialo builders program.</p>
        </div>
      </footer>
    </div>
  );
}

function Ticker({ quotes }: { quotes: DemoQuote[] }) {
  const row = [...quotes, ...quotes];
  return (
    <div className="overflow-hidden border-b border-line bg-panel/70 py-2" aria-label="Demo price ticker">
      <div className="marquee flex w-max gap-8 whitespace-nowrap text-sm">
        {row.map((q, i) => (
          <span key={i} className="flex items-center gap-2" aria-hidden={i >= quotes.length}>
            <span className="font-mono text-muted">{q.ticker}</span>
            <span className="tabular">{q.price.toFixed(2)}</span>
            <Delta value={q.change} className="text-xs" />
          </span>
        ))}
        <span className="text-xs uppercase tracking-wider text-amber-300">Demo prices · simulation</span>
      </div>
    </div>
  );
}

function MarketPanel({ quotes }: { quotes: DemoQuote[] }) {
  return (
    <div className="rounded-3xl border border-line bg-panel p-5 shadow-2xl shadow-black/40">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 animate-pulse rounded-full bg-up" /> Market panel
        </span>
        <Badge tone="warn">Demo · simulation</Badge>
      </div>
      <div className="divide-y divide-line">
        {quotes.slice(0, 6).map((q) => (
          <div key={q.id} className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-3 py-2.5 text-sm">
            <span className="flex items-center gap-2">
              <span>{q.icon}</span>
              <span>{q.name}</span>
            </span>
            <span className="tabular text-right">{q.price.toFixed(2)}</span>
            <Delta value={q.change} className="w-20 text-right text-xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sticky sign-in CTA that is never lost while scrolling the opening and the landing page. */
export function StickyCta() {
  return (
    <div className="fixed bottom-4 right-1/2 z-50 translate-x-1/2 md:right-6 md:translate-x-0">
      <GoogleButton className="shadow-2xl shadow-black/60 ring-1 ring-gold/40" />
    </div>
  );
}
