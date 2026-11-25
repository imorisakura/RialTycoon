"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Delta, Sparkline } from "@/components/ui/Sparkline";
import { useDemoPrices } from "@/components/landing/useDemoPrices";
import type { AssetId } from "@/lib/game/data";

gsap.registerPlugin(ScrollTrigger);

const PANELS = 4;
const pad = (n: number) => String(n).padStart(2, "0");

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function Opening() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current!;
    const track = trackRef.current!;
    const ctx = gsap.context(() => {
      const distance = () => track.scrollWidth - window.innerWidth;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 1,
          start: "top top",
          end: () => "+=" + track.scrollWidth,
          invalidateOnRefresh: true,
          snap: { snapTo: 1 / (PANELS - 1), inertia: false, directional: false, duration: { min: 0.2, max: 0.5 }, delay: 0.05, ease: "power1.inOut" },
          onUpdate: (self) => {
            setProgress(self.progress);
            setActive(Math.round(self.progress * (PANELS - 1)));
          },
        },
      });
      triggerRef.current = tl.scrollTrigger ?? null;

      // Horizontal journey: 3 units of timeline = 3 panel transitions.
      tl.to(track, { x: () => -distance(), duration: PANELS - 1 }, 0);
      // Centerpiece coin scales and spins, then "explodes" into the asset cards.
      tl.to("[data-coin]", { scale: 1.9, rotate: 540, duration: 0.55 }, 0).to("[data-coin]", { scale: 0.2, opacity: 0, duration: 0.2 }, 0.55);
      // Giant outline text drifts with parallax behind the title.
      tl.to("[data-outline]", { xPercent: -35, duration: 1 }, 0);
      tl.from("[data-asset-card]", { scale: 0.2, opacity: 0, x: () => -window.innerWidth * 0.25, stagger: 0.04, duration: 0.4 }, 0.35);
      tl.from("[data-rialo-row]", { y: 40, opacity: 0, stagger: 0.08, duration: 0.35 }, 1.4);
      tl.from("[data-final]", { y: 30, opacity: 0, duration: 0.35 }, 2.5);
    }, section);
    return () => {
      triggerRef.current = null;
      ctx.revert();
    };
  }, [reduced]);

  const goTo = (i: number) => {
    const st = triggerRef.current;
    if (!st) return document.getElementById(`panel-${i + 1}`)?.scrollIntoView({ behavior: "smooth" });
    window.scrollTo({ top: st.start + (st.end - st.start) * (i / (PANELS - 1)), behavior: "smooth" });
  };
  const skip = () => document.getElementById("landing")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });

  const hudTop = (
    <div className={`${reduced ? "sticky bg-bg/80 backdrop-blur" : "absolute"} inset-x-0 top-0 z-30`}>
      {!reduced && (
        <div className="h-1 w-full bg-white/10">
          <div className="h-full bg-gold transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3 md:px-8">
        <span className="font-semibold tracking-tight text-ink">
          Rial<span className="text-gold">Tycoon</span>
        </span>
        <button onClick={skip} className="rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-sm text-ink backdrop-blur hover:border-gold">
          Skip intro ↓
        </button>
      </div>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      id="intro"
      aria-label="RialTycoon welcome"
      className={`relative overflow-hidden bg-bg ${reduced ? "" : "h-dvh"}`}
    >
      <div className="grid-bg pointer-events-none absolute inset-0" />
      {reduced && hudTop}

      {/* Pinned centerpiece (decorative) */}
      {!reduced && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center md:justify-end md:pr-[12vw]" aria-hidden="true">
          <div data-coin className="opacity-90 max-md:-translate-y-[30vh] max-md:translate-x-[28vw] max-md:scale-[0.55]">
            <Coin />
          </div>
        </div>
      )}

      <div ref={trackRef} className={reduced ? "flex flex-col" : "flex h-full w-max"}>
        <Panel index={0} active={active} reduced={reduced}>
          <WelcomePanel reduced={reduced} />
        </Panel>
        <Panel index={1} active={active} reduced={reduced}>
          <MarketsPanel />
        </Panel>
        <Panel index={2} active={active} reduced={reduced}>
          <WhyRialoPanel />
        </Panel>
        <Panel index={3} active={active} reduced={reduced}>
          <SignInPanel />
        </Panel>
      </div>

      {/* HUD: always visible during the opening */}
      {!reduced && hudTop}

      {!reduced && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-4 pb-24 md:px-8 md:pb-5">
          <span className="tabular font-mono text-sm text-muted" aria-live="polite">
            <span className="text-gold">{pad(active + 1)}</span> / {pad(PANELS)}
          </span>
          <nav aria-label="Intro panels" className="flex gap-2">
            {Array.from({ length: PANELS }, (_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to panel ${i + 1}`}
                aria-current={active === i}
                className={`h-2.5 rounded-full transition-all ${active === i ? "w-7 bg-gold" : "w-2.5 bg-white/30 hover:bg-white/60"}`}
              />
            ))}
          </nav>
          <span className="w-12" />
        </div>
      )}
    </section>
  );
}

function Panel({ index, active, reduced, children }: { index: number; active: number; reduced: boolean; children: ReactNode }) {
  const isActive = reduced || index === active;
  return (
    <div
      id={`panel-${index + 1}`}
      inert={!isActive}
      aria-hidden={!isActive}
      className={`relative flex w-screen shrink-0 items-center ${reduced ? "min-h-dvh py-24" : "h-full"}`}
      style={reduced ? undefined : { visibility: isActive ? "visible" : "hidden", pointerEvents: isActive ? "auto" : "none" }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-10">{children}</div>
    </div>
  );
}

function Coin() {
  return (
    <div className="relative h-56 w-56 rounded-full md:h-72 md:w-72" style={{ background: "radial-gradient(circle at 35% 30%, #fff3c8 0%, #e8b84a 35%, #9a7222 75%, #5c4210 100%)", boxShadow: "0 0 80px rgba(232,184,74,0.35), inset 0 0 0 10px rgba(255,255,255,0.08)" }}>
      <div className="absolute inset-5 rounded-full border-2 border-white/25" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-black/70">
        <span className="text-6xl font-black md:text-7xl">R</span>
        <span className="text-[10px] font-bold tracking-[0.35em]">RWA VAULT</span>
      </div>
    </div>
  );
}

const DemoNote = ({ className = "" }: { className?: string }) => (
  <p className={`text-[11px] uppercase tracking-wider text-muted ${className}`}>All figures are demo illustrations, not market data.</p>
);

function WelcomePanel({ reduced }: { reduced: boolean }) {
  const chips = ["xGOLD", "Live prices", "xOIL", "On-chain", "xSCBD", "xSPX"];
  return (
    <div className="relative">
      <div data-outline aria-hidden="true" className="text-outline pointer-events-none absolute -top-28 left-0 select-none whitespace-nowrap text-[22vw] font-black leading-none md:-top-40">
        REAL WORLD ASSETS
      </div>
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-gold">GameFi · Web3 · Real-world assets</p>
      <h1 className="gold-text text-6xl font-black tracking-tight sm:text-8xl md:text-9xl">RialTycoon</h1>
      <p className="mt-5 max-w-xl text-lg text-ink/80 md:text-2xl">Own the real world on-chain. Trade gold, oil and city property like a tycoon.</p>
      <div className="mt-8 flex max-w-lg flex-wrap gap-2">
        {chips.map((c, i) => (
          <span key={c} className={`rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-xs text-gold ${reduced ? "" : "float"}`} style={{ animationDelay: `${i * 0.4}s` }}>
            {c}
          </span>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted">Scroll to begin the journey →</p>
      <DemoNote className="mt-2" />
    </div>
  );
}

const FEATURED: { id: AssetId; label: string }[] = [
  { id: "GOLD", label: "Gold" },
  { id: "OIL", label: "Oil" },
  { id: "SPX", label: "Stocks" },
  { id: "SCBD", label: "Property" },
  { id: "UST10Y", label: "Bonds" },
  { id: "COPPER", label: "Commodities" },
];

function MarketsPanel() {
  const quotes = useDemoPrices(2600);
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">02 · Real-world markets</p>
      <h2 className="mt-3 text-4xl font-bold md:text-6xl">One vault. Every market.</h2>
      <p className="mt-3 max-w-xl text-muted">The coin breaks open into the assets behind it — each one tokenized and tradable in the game.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {FEATURED.map(({ id, label }) => {
          const q = quotes.find((x) => x.id === id)!;
          return (
            <div key={id} data-asset-card className="rounded-2xl border border-line bg-panel/80 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{label}</span>
                <span className="font-mono">{q.ticker}</span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="tabular text-xl font-semibold md:text-2xl">{q.price.toFixed(2)}</span>
                <Sparkline points={q.points} width={72} height={24} />
              </div>
              <Delta value={q.change} className="mt-1 block text-xs" />
            </div>
          );
        })}
      </div>
      <DemoNote className="mt-4" />
    </div>
  );
}

export const RIALO_ADVANTAGES = [
  { title: "Native HTTPS calls", line: "Contracts fetch real-world prices directly. No third-party oracle." },
  { title: "Reactivity", line: "Event-driven contracts react to world events. No keeper bots." },
  { title: "TEE randomness", line: "Verifiably fair draws and confidential execution for sealed bids." },
  { title: "Scheduled transactions", line: "On-chain timers pay yield and run market cycles." },
];

function WhyRialoPanel() {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">03 · Why Rialo</p>
      <h2 className="mt-3 text-4xl font-bold md:text-6xl">Built for a chain that reaches the real world.</h2>
      <ul className="mt-8 grid gap-3 md:grid-cols-2">
        {RIALO_ADVANTAGES.map((a, i) => (
          <li key={a.title} data-rialo-row className="flex gap-4 rounded-2xl border border-line bg-panel/80 p-5">
            <span className="font-mono text-gold">{pad(i + 1)}</span>
            <div>
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm text-muted">{a.line}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">Rialo is its own SVM-compatible Layer 1 by Subzero Labs.</p>
    </div>
  );
}

function SignInPanel() {
  return (
    <div data-final className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">04 · Sign in and play</p>
      <h2 className="mt-3 text-4xl font-bold md:text-6xl">Your Google account is your key.</h2>
      <p className="mt-4 text-muted">
        No seed phrase, no extension, no gas pop-ups. Sign in with Google and a secure embedded wallet is created for you, with a
        10,000 $RIALO devnet grant to start (simulated).
      </p>
      <div className="mt-8">
        <GoogleButton size="lg" />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel/80 p-4">
          <p className="font-semibold">🔑 Passkey</p>
          <p className="text-sm text-muted">Recommended 2FA. Protects large sells, bids, withdrawals and wallet export.</p>
        </div>
        <div className="rounded-2xl border border-line bg-panel/80 p-4">
          <p className="font-semibold">⏱️ Authenticator app (TOTP)</p>
          <p className="text-sm text-muted">Fallback 2FA. Routine small trades stay instant — no prompts.</p>
        </div>
      </div>
    </div>
  );
}
