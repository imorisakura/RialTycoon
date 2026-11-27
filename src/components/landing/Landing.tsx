"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { AssetLogo } from "@/components/ui/Icons";
import { Change, Rolling, usd } from "@/components/ui/Rolling";
import { useSharedMarket } from "@/lib/market/LiveMarketContext";
import { CATEGORY_LABEL, LIVE_ASSETS, LIVE_BY_ID, type LiveCategory, type LiveQuote, type QuoteSource } from "@/lib/market/universe";

gsap.registerPlugin(ScrollTrigger);

/** Mechanic → the Rialo feature that would run it → what that feature removes. Used here and in the game's info panel. */
export const RIALO_MAPPING = [
  { mechanic: "Live prices", feature: "Native HTTPS calls", detail: "Contracts read price APIs directly, with no third-party oracle in between." },
  { mechanic: "World events", feature: "Reactivity", detail: "ON and EVERY triggers react to events, so no keeper bots poll for them." },
  { mechanic: "Sealed-bid auctions", feature: "TEE randomness", detail: "Bids stay confidential and ties are broken by verifiable randomness." },
  { mechanic: "Yield and cycles", feature: "Scheduled transactions", detail: "On-chain timers pay yield and advance cycles without a cron server." },
  { mechanic: "Google sign-in", feature: "Rialo Identity", detail: "A Google account maps to an on-chain identity instead of a seed phrase." },
];

const BOARD = ["BTC", "ETH", "SOL", "PAXG", "NVDA", "AAPL", "USO", "SPY"];
const NAV = [
  { href: "#markets", label: "Markets" },
  { href: "#how", label: "How it works" },
  { href: "#rialo", label: "Why Rialo" },
];

export const SOURCE_NAME: Record<QuoteSource, string> = {
  coinbase: "Coinbase",
  coingecko: "CoinGecko",
  finnhub: "Finnhub",
  sim: "Sim, no data",
};

function useEnter(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.set("[data-enter]", { y: 16, opacity: 0 });
      ScrollTrigger.batch("[data-enter]", {
        start: "top 90%",
        onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 0.24, ease: "power2.out", stagger: 0.04, overwrite: true }),
      });
    }, el);
    return () => ctx.revert();
  }, [root]);
}

export function Landing() {
  const { quotes, stream, market } = useSharedMarket();
  const ref = useRef<HTMLDivElement>(null);
  useEnter(ref);
  const liveCount = Object.values(quotes).filter((q) => q.source !== "sim").length;

  return (
    <div id="landing" ref={ref} className="relative bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
          <a href="#landing" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight">
            <CoinMark />
            RialTycoon
          </a>
          <nav className="hidden gap-7 text-sm text-muted md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="tx hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden sm:block">
            <GoogleButton size="sm" />
          </div>
        </div>
      </header>

      <Tape quotes={quotes} />

      {/* Hero: the board is the product, read from the live feed. */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 md:px-8 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:pb-28 lg:pt-20">
        <div className="flex flex-col justify-center" data-enter>
          <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[68px]">Trade the real world.</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            Bitcoin, Nvidia, gold and oil at live market prices, traded with play money. Sign in with Google and you start with{" "}
            <span className="text-ink">10,000 $RIALO</span>.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <GoogleButton size="lg" />
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6 text-sm">
            <div>
              <dt className="text-muted">Markets</dt>
              <dd className="tabular mt-1 text-2xl font-semibold">{LIVE_ASSETS.length}</dd>
            </div>
            <div>
              <dt className="text-muted">Live now</dt>
              <dd className="tabular mt-1 text-2xl font-semibold">{market ? liveCount : "…"}</dd>
            </div>
            <div>
              <dt className="text-muted">US session</dt>
              <dd className="mt-1 text-2xl font-semibold">{market ? (market.usMarketOpen ? "Open" : "Closed") : "…"}</dd>
            </div>
          </dl>
        </div>
        <Board quotes={quotes} stream={stream} />
      </section>

      <Markets quotes={quotes} />

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-8 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:py-28">
          <h2 data-enter className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
            How a game works
          </h2>
          <ol className="space-y-8 text-[17px] leading-relaxed text-muted">
            <li data-enter>
              <p className="font-medium text-ink">Sign in with Google.</p>
              Privy creates an embedded wallet after your first login. There is no seed phrase to write down and no extension to install.
            </li>
            <li data-enter>
              <p className="font-medium text-ink">Trade the Live Market.</p>
              You get 10,000 $RIALO of play money, worth 1 USD each. Crypto trades around the clock; US stocks and the ETFs that track gold, oil and
              copper trade during the New York session.
            </li>
            <li data-enter>
              <p className="font-medium text-ink">Or play the Simulation Season.</p>
              Eight assets, fourteen world events that move them, yield every cycle, a sealed-bid auction and a leaderboard ranked by return on
              capital. Reach 25,000 $RIALO to become a Tycoon.
            </li>
            <li data-enter>
              <p className="font-medium text-ink">Protect the big moves.</p>
              Sells above 100 $RIALO, auction bids, withdrawals and wallet export ask for a passkey or an authenticator code. Small trades never
              do.
            </li>
          </ol>
        </div>
      </section>

      {/* Why Rialo */}
      <section id="rialo" className="scroll-mt-16 border-t border-line bg-panel">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-[5fr_7fr] lg:gap-16">
            <h2 data-enter className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
              Built for Rialo
            </h2>
            <p data-enter className="max-w-xl text-[17px] leading-relaxed text-muted">
              Rialo is a Layer 1 from Subzero Labs, compatible with the Solana VM but not the Solana network. Each part of the game maps to a
              Rialo feature that would run it on-chain. Today the game uses a mock adapter and calls no Rialo RPC.
            </p>
          </div>
          <div className="mt-12 overflow-x-auto" data-enter>
            <table className="w-full min-w-[640px] text-left">
              <thead className="text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="py-3 pr-6 font-medium">In the game</th>
                  <th className="py-3 pr-6 font-medium">On Rialo</th>
                  <th className="py-3 font-medium">What it replaces</th>
                </tr>
              </thead>
              <tbody>
                {RIALO_MAPPING.map((m) => (
                  <tr key={m.mechanic} className="border-b border-line">
                    <td className="py-5 pr-6 text-lg font-medium">{m.mechanic}</td>
                    <td className="py-5 pr-6 text-lg text-gold">{m.feature}</td>
                    <td className="py-5 text-muted">{m.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-20 md:flex-row md:items-center md:px-8 lg:py-24">
          <h2 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Start with 10,000 $RIALO.</h2>
          <GoogleButton size="lg" />
        </div>
      </section>

      <footer className="border-t border-line pb-28 pt-10 text-sm text-muted">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 md:flex-row md:px-8">
          <p className="flex items-center gap-2.5 text-ink">
            <CoinMark /> RialTycoon <span className="text-muted">rialtycoon.rialo.app</span>
          </p>
          <p>
            Prices from Coinbase, Finnhub and{" "}
            <a href="https://www.coingecko.com" className="tx underline underline-offset-2 hover:text-ink" target="_blank" rel="noopener noreferrer">
              CoinGecko
            </a>
            . Logos are trademarks of their owners; Amazon icon by Font Awesome (CC BY 4.0). Balances are play money. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function CoinMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="var(--color-gold)" />
      <circle cx="12" cy="12" r="8.4" fill="none" stroke="var(--color-gold-deep)" strokeWidth="1" />
      <path d="M9.2 16.5V7.5h3.4a2.6 2.6 0 0 1 0 5.2H9.2m3.2 0 2.6 3.8" fill="none" stroke="#2a1f08" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tape({ quotes }: { quotes: Record<string, LiveQuote> }) {
  const items = LIVE_ASSETS.filter((a) => quotes[a.id]);
  if (!items.length) return <div className="h-11 border-b border-line" />;
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-b border-line bg-panel" aria-label="Live ticker tape">
      <div className="tape flex w-max items-center">
        {row.map((a, i) => {
          const q = quotes[a.id];
          return (
            <span key={i} className="flex h-11 items-center gap-2.5 border-r border-line px-5 text-sm" aria-hidden={i >= items.length}>
              <AssetLogo id={a.id} category={a.category} size={18} />
              <span className="font-mono text-xs text-muted">{a.ticker}</span>
              <span className="tabular font-medium">{usd(q.price)}</span>
              <Change value={q.change} className="text-xs" />
            </span>
          );
        })}
      </div>
    </div>
  );
}

function StreamState({ stream }: { stream: string }) {
  const live = stream === "live";
  return (
    <span className="flex items-center gap-2 text-sm text-muted">
      <span className={`h-2 w-2 rounded-full ${live ? "bg-up" : "bg-faint"}`} />
      {live ? "Streaming from Coinbase" : stream === "connecting" ? "Connecting to the stream" : "Stream offline, using snapshots"}
    </span>
  );
}

function Board({ quotes, stream }: { quotes: Record<string, LiveQuote>; stream: string }) {
  return (
    <div data-enter className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <span className="font-medium">Live board</span>
        <StreamState stream={stream} />
      </div>
      <ul>
        {BOARD.map((id) => {
          const a = LIVE_BY_ID[id];
          const q = quotes[id];
          return (
            <li key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-line px-5 py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_96px]">
              <div className="flex min-w-0 items-center gap-3">
                <AssetLogo id={id} category={a.category} size={32} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.category === "commodity" ? `${a.name} (${a.ticker})` : a.name}</p>
                  <p className="text-xs text-faint">
                    <span className="font-mono">{a.ticker}</span>
                    {q && <>, {SOURCE_NAME[q.source]}</>}
                  </p>
                </div>
              </div>
              <div className="text-right text-[26px] font-semibold leading-none tracking-[-0.02em] sm:text-[30px]">
                {q ? <Rolling value={q.price} format={usd} /> : <span className="text-base text-faint">Loading</span>}
              </div>
              <div className="col-start-2 text-right text-sm sm:col-start-3">{q && <Change value={q.change} />}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const TABS: LiveCategory[] = ["crypto", "stock", "commodity", "income"];

function Markets({ quotes }: { quotes: Record<string, LiveQuote> }) {
  const [tab, setTab] = useState<LiveCategory>("crypto");
  const rows = useMemo(() => LIVE_ASSETS.filter((a) => a.category === tab), [tab]);
  return (
    <section id="markets" className="scroll-mt-16 border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div data-enter>
            <h2 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Every market in the game</h2>
            <p className="mt-3 max-w-xl text-muted">
              Gold, oil, copper and the other commodities are priced through the US-listed ETFs that track them. Each row names its source.
            </p>
          </div>
          <div role="tablist" aria-label="Market category" className="flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-line p-1">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`tx rounded-[4px] px-3.5 py-1.5 text-sm ${tab === t ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
              >
                {CATEGORY_LABEL[t]}
                <span className="tabular ml-1.5 opacity-60">{LIVE_ASSETS.filter((a) => a.category === t).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="text-sm text-muted">
              <tr className="border-b border-line">
                <th className="py-3 pr-4 font-medium">Asset</th>
                <th className="py-3 pr-4 text-right font-medium">Price (USD)</th>
                <th className="py-3 pr-4 text-right font-medium">Change</th>
                <th className="py-3 pr-4 font-medium">Trades</th>
                <th className="py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const q = quotes[a.id];
                return (
                  <tr key={a.id} className="border-b border-line">
                    <td className="py-3.5 pr-4">
                      <span className="flex items-center gap-3">
                        <AssetLogo id={a.id} category={a.category} size={28} />
                        <span className="font-medium">{a.name}</span>
                        <span className="font-mono text-xs text-faint">{a.ticker}</span>
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right text-lg font-semibold">{q ? <Rolling value={q.price} format={usd} /> : <span className="text-sm text-faint">Loading</span>}</td>
                    <td className="py-3.5 pr-4 text-right text-sm">{q && <Change value={q.change} />}</td>
                    <td className="py-3.5 pr-4 text-sm text-muted">{a.category === "crypto" ? "24/7" : "US market hours"}</td>
                    <td className={`py-3.5 text-sm ${q?.source === "sim" ? "text-gold" : "text-muted"}`}>{q ? SOURCE_NAME[q.source] : "…"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** Sticky sign-in, never lost while scrolling the opening and the landing page. */
export function StickyCta() {
  return (
    <div className="fixed bottom-4 right-1/2 z-50 translate-x-1/2 md:right-6 md:translate-x-0">
      <GoogleButton className="shadow-[0_8px_24px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
