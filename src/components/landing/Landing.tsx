"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, useRef } from "react";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { AssetIcon } from "@/components/ui/Icons";
import { Delta, Sparkline } from "@/components/ui/Sparkline";
import { ASSET_BY_ID, ASSET_CLASSES } from "@/lib/game/data";
import { useDemoPrices, type DemoQuote } from "./useDemoPrices";

gsap.registerPlugin(ScrollTrigger, SplitText);

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

const STEPS = [
  ["Sign in with Google", "An embedded wallet is created for you and 10,000 $RIALO lands on devnet (simulated). No seed phrase, ever."],
  ["Read the world", "Each cycle, world events move the market. A strait closes, oil jumps. Rates fall, property climbs."],
  ["Become a Tycoon", "Collect yield, time your exits and grow to 25,000 $RIALO. The season leaderboard ranks return on capital."],
];

function useReveals(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>("[data-split]").forEach((h) => {
        const split = SplitText.create(h, { type: "lines", mask: "lines" });
        gsap.from(split.lines, {
          yPercent: 110,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: h, start: "top 85%" },
        });
      });
      gsap.set("[data-reveal]", { y: 40, opacity: 0 });
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        onEnter: (batch) => gsap.fromTo(batch, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.07, overwrite: true }),
      });
    }, el);
    return () => ctx.revert();
  }, [root]);
}

export function Landing() {
  const quotes = useDemoPrices();
  const ref = useRef<HTMLDivElement>(null);
  useReveals(ref);

  return (
    <div id="landing" ref={ref} className="relative bg-bg">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 md:px-10">
          <a href="#landing" className="font-display text-2xl leading-none">
            Rial<span className="italic text-gold">Tycoon</span>
          </a>
          <nav className="hidden gap-8 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="eyebrow text-muted transition hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden sm:block">
            <GoogleButton size="sm" />
          </div>
        </div>
      </header>

      <Ticker quotes={quotes} />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-20 md:px-10 md:pb-28 md:pt-28">
        <p className="eyebrow text-gold" data-reveal>
          Built for Rialo · Devnet preview
        </p>
        <h1 data-split className="mt-6 max-w-5xl font-display text-[15vw] leading-[0.88] tracking-[-0.02em] md:text-[8.5vw] xl:text-[128px]">
          Own the real world. <em className="text-gold">Play it like a tycoon.</em>
        </h1>
        <div className="mt-14 grid gap-12 md:grid-cols-[1fr_1.15fr] md:items-end">
          <div data-reveal>
            <p className="max-w-md text-lg leading-relaxed text-ink/75">
              Gold, oil, the S&amp;P 500 and Jakarta CBD property — tokenized, tradable and moved by world events. Grow 10,000 $RIALO into
              a 25,000 empire.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <GoogleButton size="lg" />
              <span className="eyebrow text-muted">No extension · No seed phrase</span>
            </div>
          </div>
          <MarketPanel quotes={quotes} />
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Stats" className="border-y border-white/[0.07]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
          {[
            ["8", "Tradable real-world assets"],
            ["14", "World events that move prices"],
            ["10k", "$RIALO starting grant"],
            ["25k", "Net worth to reach Tycoon"],
          ].map(([v, l], i) => (
            <div key={l} data-reveal className={`px-5 py-10 md:px-10 ${i % 2 ? "" : "border-r"} border-white/[0.07] md:border-r md:last:border-r-0`}>
              <p className="font-display text-6xl leading-none text-gold md:text-7xl">{v}</p>
              <p className="eyebrow mt-3 text-muted">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured assets */}
      <section id="markets" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 md:px-10 md:py-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-gold">01 — Markets</p>
            <h2 data-split className="mt-4 font-display text-5xl leading-[0.95] md:text-7xl">
              Featured assets
            </h2>
          </div>
          <p className="eyebrow text-amber-300/80">Demo prices · simulation</p>
        </div>
        <div className="mt-12 grid border-l border-t border-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">
          {quotes
            .filter((q) => ["GOLD", "OIL", "SPX", "SCBD"].includes(q.id))
            .map((q, i) => (
              <article
                key={q.id}
                data-reveal
                className="group relative border-b border-r border-white/[0.07] p-6 transition-colors duration-500 hover:bg-gold/[0.04] md:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs text-muted">0{i + 1}</span>
                  <AssetIcon id={q.id} className="h-7 w-7 text-gold transition-transform duration-500 group-hover:-translate-y-1" />
                </div>
                <h3 className="mt-14 font-display text-4xl leading-none">{q.name}</h3>
                <p className="eyebrow mt-2 text-muted">
                  {q.ticker} · {ASSET_CLASSES[ASSET_BY_ID[q.id].classId].name}
                </p>
                <div className="mt-8 flex items-end justify-between gap-3">
                  <div>
                    <p className="tabular font-mono text-2xl">{q.price.toFixed(2)}</p>
                    <Delta value={q.change} className="mt-1 block text-xs" />
                  </div>
                  <Sparkline points={q.points} width={104} height={36} />
                </div>
                <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100" />
              </article>
            ))}
        </div>
      </section>

      {/* How to play */}
      <section id="how" className="scroll-mt-20 border-t border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
          <p className="eyebrow text-gold">02 — How to play</p>
          <h2 data-split className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] md:text-7xl">
            Three moves from <em className="text-gold">intern to tycoon.</em>
          </h2>
          <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {STEPS.map(([t, d], i) => (
              <li key={t} data-reveal className="border-t border-white/15 pt-6">
                <span className="font-display text-7xl leading-none text-white/15">0{i + 1}</span>
                <p className="mt-6 font-display text-3xl">{t}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why Rialo */}
      <section id="why-rialo" className="scroll-mt-20 border-t border-white/[0.07] bg-[#0d0c0a]">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
          <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-end">
            <div>
              <p className="eyebrow text-gold">03 — Why Rialo</p>
              <h2 data-split className="mt-4 font-display text-5xl leading-[0.95] md:text-7xl">
                Every mechanic, <em className="text-gold">native to the chain.</em>
              </h2>
            </div>
            <p data-reveal className="max-w-lg text-muted md:justify-self-end">
              Rialo is its own SVM-compatible Layer 1 by Subzero Labs. Each game mechanic maps to a Rialo-native feature that would power it
              for real. Today every price and balance is a local simulation.
            </p>
          </div>
          <div className="mt-14 border-t border-white/10">
            {RIALO_MAPPING.map((m, i) => (
              <div
                key={m.mechanic}
                data-reveal
                className="group grid gap-2 border-b border-white/10 py-6 transition-colors hover:bg-white/[0.02] md:grid-cols-[60px_1fr_1fr_1.4fr] md:items-baseline md:gap-6"
              >
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
                <span className="font-display text-3xl">{m.mechanic}</span>
                <span className="font-display text-3xl italic text-gold">→ {m.feature}</span>
                <span className="text-sm text-muted">{m.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-white/[0.07]">
        <div className="pointer-events-none absolute -right-40 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-gold/20 blur-[140px]" />
        <div className="relative mx-auto max-w-7xl px-5 py-28 md:px-10 md:py-40">
          <h2 data-split className="max-w-4xl font-display text-6xl leading-[0.9] md:text-[9vw] xl:text-[136px]">
            Start your empire <em className="text-gold">in one click.</em>
          </h2>
          <div data-reveal className="mt-12 flex flex-wrap items-center gap-6">
            <GoogleButton size="lg" />
            <p className="max-w-xs text-sm text-muted">Google sign-in. Secure embedded wallet. 2FA only when it matters.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] pb-28 pt-14">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <p aria-hidden="true" className="text-outline select-none font-display text-[20vw] leading-[0.8] md:text-[15vw]">
            RialTycoon
          </p>
          <div className="mt-10 flex flex-col justify-between gap-4 text-sm text-muted md:flex-row">
            <p>
              <span className="text-ink">RialTycoon</span> · rialtycoon.rialo.app
            </p>
            <p>Balances are play money. Landing prices are demo; in-game Live Market prices come from labeled third-party feeds. Not financial advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Ticker({ quotes }: { quotes: DemoQuote[] }) {
  const row = [...quotes, ...quotes];
  return (
    <div className="overflow-hidden border-b border-white/[0.07] py-3" aria-label="Demo price ticker">
      <div className="marquee flex w-max items-center gap-10 whitespace-nowrap">
        {row.map((q, i) => (
          <span key={i} className="flex items-center gap-3" aria-hidden={i >= quotes.length}>
            <AssetIcon id={q.id} className="h-4 w-4 text-gold/70" />
            <span className="font-display text-xl">{q.name}</span>
            <span className="tabular font-mono text-sm text-ink/80">{q.price.toFixed(2)}</span>
            <Delta value={q.change} className="text-xs" />
            <span className="text-white/15">/</span>
          </span>
        ))}
        <span className="eyebrow text-amber-300/80">Demo prices · simulation</span>
      </div>
    </div>
  );
}

function MarketPanel({ quotes }: { quotes: DemoQuote[] }) {
  return (
    <div data-reveal className="border border-white/10 bg-white/[0.02] backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <span className="eyebrow flex items-center gap-2 text-ink">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" /> Market panel
        </span>
        <span className="eyebrow text-amber-300/80">Demo · simulation</span>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {quotes.slice(0, 6).map((q) => (
          <div key={q.id} className="grid grid-cols-[1.5fr_1fr_auto] items-center gap-3 px-5 py-3">
            <span className="flex items-center gap-3">
              <AssetIcon id={q.id} className="h-4 w-4 text-gold" />
              <span className="font-display text-lg leading-none">{q.name}</span>
            </span>
            <span className="tabular text-right font-mono text-sm">{q.price.toFixed(2)}</span>
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
