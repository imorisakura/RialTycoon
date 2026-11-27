"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { ClockIcon, KeyIcon } from "@/components/ui/Icons";
import { Change, Rolling, usd } from "@/components/ui/Rolling";
import { useSharedMarket } from "@/lib/market/LiveMarketContext";
import { LIVE_ASSETS, LIVE_BY_ID } from "@/lib/market/universe";
import { LAYER_LABELS, VaultScene, webglAvailable } from "./vault-scene";

gsap.registerPlugin(ScrollTrigger);

const CHAPTERS = 4;
const pad = (n: number) => String(n).padStart(2, "0");
const GROUND = "#0a0b0d";
const DEEP = "#050506";

export const RIALO_ADVANTAGES = [
  { title: "Native HTTPS calls", line: "Contracts read prices from the web themselves. No oracle network." },
  { title: "Reactivity", line: "Contracts fire on events and on timers. No keeper bots." },
  { title: "TEE randomness", line: "Sealed bids stay sealed, and ties are broken by verifiable randomness." },
  { title: "Scheduled transactions", line: "Yield and market cycles run on-chain, on time." },
];

/** Which live asset represents each exploded layer, and how many markets the layer holds. */
const LAYER_REP: Record<string, string> = { rim: "GLD", gear: "BTC", dial: "NVDA", train: "IEF" };
const LAYER_CATEGORY: Record<string, string> = { rim: "commodity", gear: "crypto", dial: "stock", train: "income" };

function useReducedMotion() {
  const [reduced, setReduced] = useState<boolean | null>(null);
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
  const { quotes, stream, tickCount } = useSharedMarket();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const preloaderRef = useRef<HTMLDivElement>(null);
  const loadCountRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [gl, setGl] = useState(true);
  const gold = quotes.PAXG;

  // Scene + scroll choreography
  useEffect(() => {
    if (reduced === null) return;
    const section = sectionRef.current!;
    const canvas = canvasRef.current!;
    const hasGl = webglAvailable();
    setGl(hasGl);
    const root = document.documentElement;
    let scene: VaultScene | null = null;
    let raf = 0;
    let visible = true;
    let alive = true;
    const proxy = { p: 0 };

    const resize = () => scene?.resize(section.clientWidth, window.innerHeight);

    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (!scene || !visible || document.hidden) return;
      scene.p = proxy.p;
      scene.render();
      const lbl = labelsRef.current;
      if (lbl) {
        const pos = scene.labelPositions();
        const show = Math.min(1, Math.max(0, (proxy.p - 0.7) / 0.25)) * (1 - Math.min(1, Math.max(0, (proxy.p - 1.1) / 0.2)));
        lbl.style.opacity = String(show);
        Array.from(lbl.children).forEach((el, i) => {
          const q = pos[i];
          (el as HTMLElement).style.transform = `translate3d(${q.x}px, ${q.y}px, 0)`;
        });
      }
    };

    const onPointer = (e: PointerEvent) => scene?.setPointer(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);

    const start = async () => {
      // Preloader: the counter reports real progress (fonts, then the scene).
      const count = { v: 0 };
      const show = () => loadCountRef.current && (loadCountRef.current.textContent = String(Math.round(count.v)));
      if (!reduced) root.style.overflow = "hidden";
      const counter = gsap.to(count, { v: 60, duration: 0.6, ease: "power2.out", onUpdate: show });
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
      if (!alive) return;
      if (hasGl) {
        try {
          scene = new VaultScene(canvas);
          resize();
          scene.render();
        } catch {
          scene = null;
          setGl(false);
        }
      }
      counter.kill();
      await gsap.to(count, { v: 100, duration: 0.24, ease: "power1.out", onUpdate: show });
      if (!alive) return;
      root.style.overflow = "";
      setLoaded(true);
      if (reduced) {
        scene?.render();
        return;
      }
      raf = requestAnimationFrame(frame);
      gsap
        .timeline()
        .to(preloaderRef.current, { opacity: 0, duration: 0.6, ease: "power2.out" })
        .from(canvas, { scale: 0.9, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.24")
        .from("[data-hero-price]", { opacity: 0, duration: 0.6, ease: "power2.out" }, "<")
        .from("[data-ch1] > *", { y: 16, opacity: 0, duration: 0.6, ease: "power2.out", stagger: 0.06 }, "-=0.4");
    };

    const ctx = gsap.context(() => {
      if (reduced) return;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 1,
          start: "top top",
          end: () => "+=" + window.innerHeight * (CHAPTERS - 1),
          invalidateOnRefresh: true,
          snap: { snapTo: 1 / (CHAPTERS - 1), inertia: false, directional: false, duration: { min: 0.25, max: 0.6 }, delay: 0.05, ease: "power2.inOut" },
          onUpdate: (self) => {
            setProgress(self.progress);
            setActive(Math.round(self.progress * (CHAPTERS - 1)));
          },
        },
      });
      triggerRef.current = tl.scrollTrigger ?? null;
      tl.to(proxy, { p: 3, duration: 3 }, 0);
      tl.to(section, { backgroundColor: DEEP, duration: 0.45 }, 1.2);
      tl.to(section, { backgroundColor: GROUND, duration: 0.45 }, 2.2);
      // Chapter 1 → 2
      tl.to("[data-hero-price]", { yPercent: -18, opacity: 0, duration: 0.6 }, 0.05);
      tl.to("[data-ch1]", { opacity: 0, y: -24, duration: 0.3 }, 0.12);
      tl.fromTo("[data-ch2]", { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.3 }, 0.6);
      tl.to("[data-ch2]", { opacity: 0, y: -24, duration: 0.25 }, 1.15);
      // Chapter 3
      tl.fromTo("[data-ch3]", { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.3 }, 1.62);
      tl.fromTo("[data-ch3-row]", { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.25, stagger: 0.05 }, 1.66);
      tl.to("[data-ch3]", { opacity: 0, y: -24, duration: 0.25 }, 2.15);
      // Chapter 4
      tl.fromTo("[data-ch4]", { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.3 }, 2.6);
    }, section);

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
    io.observe(section);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer);
    void start();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      root.style.overflow = "";
      triggerRef.current = null;
      ctx.revert();
      scene?.dispose();
    };
  }, [reduced]);

  const goTo = (i: number) => {
    const st = triggerRef.current;
    if (!st) return document.getElementById(`chapter-${i + 1}`)?.scrollIntoView({ behavior: "smooth" });
    window.scrollTo({ top: st.start + (st.end - st.start) * (i / (CHAPTERS - 1)), behavior: "smooth" });
  };
  const skip = () => document.getElementById("landing")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  const stacked = reduced === true;

  const hud = (
    <div className={`${stacked ? "sticky bg-bg" : "absolute"} inset-x-0 top-0 z-40`}>
      {!stacked && (
        <div className="h-[2px] w-full bg-white/10">
          <div className="h-full bg-gold" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <div className="flex h-14 items-center justify-between px-5 md:px-8">
        <span className="text-[17px] font-semibold tracking-tight">RialTycoon</span>
        <button onClick={skip} className="tx h-9 rounded-[var(--radius-control)] border border-white/25 px-3.5 text-sm hover:border-white hover:bg-white hover:text-bg">
          Skip intro
        </button>
      </div>
    </div>
  );

  return (
    <section ref={sectionRef} id="intro" aria-label="RialTycoon welcome" className={`relative overflow-hidden ${stacked ? "" : "h-dvh"}`} style={{ backgroundColor: GROUND }}>
      {stacked && hud}

      {/* Live gold price behind the vault: the largest figure on the screen is a real quote. */}
      <div
        data-hero-price
        aria-hidden="true"
        className={`pointer-events-none flex select-none flex-col items-center justify-center md:items-start md:justify-start md:pl-[4vw] md:pt-[16vh] ${stacked ? "absolute inset-x-0 top-0 h-dvh" : "absolute inset-0"}`}
      >
        <span className="text-[24vw] font-semibold leading-none tracking-[-0.05em] text-[#2f343c] md:text-[16vw]">
          {gold ? <Rolling value={gold.price} format={(n) => Math.round(n).toLocaleString("en-US")} tint={false} /> : "0,000"}
        </span>
      </div>

      <canvas ref={canvasRef} aria-hidden="true" className={`${stacked ? "absolute inset-x-0 top-0 h-dvh w-full" : "absolute inset-0 h-full w-full"} ${gl ? "" : "hidden"}`} />
      {!gl && <FallbackCoin />}

      {/* Labels that follow the exploded layers, with each layer's live representative quote */}
      {!stacked && (
        <div ref={labelsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 hidden opacity-0 md:block">
          {LAYER_LABELS.map((l, i) => {
            const rep = LIVE_BY_ID[LAYER_REP[l.key]];
            const q = quotes[rep.id];
            const count = LIVE_ASSETS.filter((a) => a.category === LAYER_CATEGORY[l.key]).length;
            return (
              <div key={l.key} className="absolute left-0 top-0 will-change-transform">
                <div className="-translate-x-1/2 -translate-y-full text-center" style={{ marginTop: i % 2 ? 0 : -52 }}>
                  <p className="whitespace-nowrap text-lg font-semibold leading-tight">
                    {l.title} <span className="tabular font-normal text-muted">{count}</span>
                  </p>
                  <p className="tabular mt-0.5 whitespace-nowrap text-sm text-muted">
                    {rep.ticker} {q ? usd(q.price) : "loading"}
                  </p>
                  <div className="mx-auto mt-2 w-px bg-white/30" style={{ height: i % 2 ? 24 : 76 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Chapter index={0} active={active} stacked={stacked}>
        <div data-ch1 className="flex h-full min-h-[calc(100dvh-6rem)] flex-col justify-end pb-32 md:pb-20">
          <h1 className="text-5xl font-semibold tracking-[-0.04em] md:text-7xl">RialTycoon</h1>
          <p className="mt-4 max-w-md text-lg leading-snug text-muted">A market game on Rialo. Real prices, play money, one vault.</p>
          <p className="tabular mt-6 text-sm text-faint">
            The large figure is gold, per troy ounce, {gold ? (gold.source === "sim" ? "simulated, no live data yet" : `live via PAXG on ${gold.source === "coinbase" ? "Coinbase" : "CoinGecko"}`) : "loading"}
          </p>
        </div>
      </Chapter>

      <Chapter index={1} active={active} stacked={stacked}>
        <div data-ch2 className="pt-20 md:pt-24">
          <h2 className="max-w-xl text-4xl font-semibold tracking-[-0.035em] md:text-6xl">Four kinds of market, one vault.</h2>
          <p className="mt-4 max-w-md text-muted">
            Each layer is a market you can trade: {LIVE_ASSETS.length} in all. The figure under each name is its live price.
          </p>
          <ul className={`mt-6 grid grid-cols-2 gap-x-6 gap-y-4 ${stacked ? "" : "md:hidden"}`}>
            {LAYER_LABELS.map((l) => {
              const rep = LIVE_BY_ID[LAYER_REP[l.key]];
              const q = quotes[rep.id];
              return (
                <li key={l.key} className="border-t border-line pt-3">
                  <p className="font-semibold">{l.title}</p>
                  <p className="tabular text-sm text-muted">
                    {rep.ticker} {q ? usd(q.price) : "loading"}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </Chapter>

      <Chapter index={2} active={active} stacked={stacked} deep>
        <div data-ch3 className="flex h-full flex-col justify-center py-24">
          <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.035em] md:text-6xl">Why it belongs on Rialo</h2>
          <ul className="mt-8 max-w-2xl">
            {RIALO_ADVANTAGES.map((a) => (
              <li key={a.title} data-ch3-row className="grid gap-1 border-b border-line py-4 md:grid-cols-[240px_1fr] md:items-baseline md:gap-6">
                <span className="text-lg font-semibold">{a.title}</span>
                <span className="text-muted">{a.line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-baseline gap-4 md:absolute md:bottom-20 md:right-8 md:mt-0 md:block md:text-right">
            <span className="block text-5xl font-semibold tracking-[-0.04em] md:text-[96px] md:leading-none">
              <Rolling value={tickCount} format={(n) => n.toLocaleString("en-US")} tint={false} />
            </span>
            <span className="text-sm text-muted md:mt-3 md:block">
              {stream === "live" ? "price updates received since you opened this page" : "price updates received (stream offline)"}
            </span>
          </div>
        </div>
      </Chapter>

      <Chapter index={3} active={active} stacked={stacked}>
        <div data-ch4 className="flex h-full flex-col justify-end pb-32 md:justify-center md:pb-0">
          <div className="max-w-xl">
            <h2 className="text-4xl font-semibold tracking-[-0.035em] md:text-6xl">Your Google account is the key.</h2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
              No seed phrase, no extension, no gas pop-ups. Privy creates a wallet for you after you sign in, and you start with 10,000 $RIALO of
              play money.
            </p>
            <div className="mt-8">
              <GoogleButton size="lg" />
            </div>
            <div className="mt-8 grid max-w-md gap-4 text-sm text-muted sm:grid-cols-2">
              <p className="flex gap-2.5">
                <KeyIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>
                  <span className="text-ink">Passkey</span> for sells above 100 $RIALO, bids, withdrawals and export.
                </span>
              </p>
              <p className="flex gap-2.5">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>
                  <span className="text-ink">Authenticator app</span> as a fallback. Small trades never ask.
                </span>
              </p>
            </div>
          </div>
        </div>
      </Chapter>

      {!stacked && hud}
      {!stacked && (
        <div className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-between px-5 pb-24 md:px-8 md:pb-6">
          <span className="tabular text-sm text-muted" aria-live="polite" data-hud-counter>
            <span className="text-ink">{pad(active + 1)}</span> / {pad(CHAPTERS)}
          </span>
          <nav aria-label="Intro chapters" className="flex gap-1">
            {Array.from({ length: CHAPTERS }, (_, i) => (
              <button key={i} onClick={() => goTo(i)} aria-label={`Go to chapter ${i + 1}`} aria-current={active === i} className="group flex h-10 items-center px-1">
                <span className={`block h-[3px] rounded-full transition-[width,background-color] duration-[240ms] ${active === i ? "w-10 bg-ink" : "w-5 bg-white/30 group-hover:bg-white/60"}`} />
              </button>
            ))}
          </nav>
          <span className="hidden w-24 text-right text-sm text-muted md:block">{gold && <Change value={gold.change} />}</span>
        </div>
      )}

      {!loaded && reduced !== true && (
        <div ref={preloaderRef} className="fixed inset-0 z-[90] flex items-end justify-between bg-bg p-5 md:p-8" aria-label="Loading RialTycoon">
          <span className="text-[17px] font-semibold tracking-tight">RialTycoon</span>
          <span className="tabular text-sm text-muted">
            Loading the vault <span ref={loadCountRef}>0</span>%
          </span>
        </div>
      )}
    </section>
  );
}

function Chapter({ index, active, stacked, deep = false, children }: { index: number; active: number; stacked: boolean; deep?: boolean; children: ReactNode }) {
  const isActive = stacked || index === active;
  const style: CSSProperties = stacked
    ? { backgroundColor: deep ? DEEP : "transparent" }
    : { visibility: isActive ? "visible" : "hidden", pointerEvents: isActive ? "auto" : "none" };
  return (
    <div id={`chapter-${index + 1}`} inert={!isActive} aria-hidden={!isActive} className={stacked ? "relative z-20 min-h-dvh py-24" : "absolute inset-0 z-20"} style={style}>
      <div className="relative mx-auto h-full w-full max-w-7xl px-5 md:px-8">{children}</div>
    </div>
  );
}

function FallbackCoin() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div
        className="h-60 w-60 rounded-full md:h-80 md:w-80"
        style={{
          background: "radial-gradient(circle at 35% 30%, #f3dc9e 0%, #d4a84b 38%, #8f6d24 78%, #4d3a10 100%)",
          boxShadow: "inset 0 0 0 12px rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}
