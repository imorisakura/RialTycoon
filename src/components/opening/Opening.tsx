"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { ClockIcon, KeyIcon } from "@/components/ui/Icons";
import { LAYER_LABELS, VaultScene, webglAvailable } from "./vault-scene";

gsap.registerPlugin(ScrollTrigger);

const CHAPTERS = 4;
const pad = (n: number) => String(n).padStart(2, "0");
const INK = "#15120d";
const IVORY = "#ece7dc";
const NIGHT = "#0a0907";

export const RIALO_ADVANTAGES = [
  { title: "Native HTTPS calls", line: "Contracts fetch real-world prices directly. No third-party oracle." },
  { title: "Reactivity", line: "Event-driven contracts react to world events. No keeper bots." },
  { title: "TEE randomness", line: "Verifiably fair draws and confidential execution for sealed bids." },
  { title: "Scheduled transactions", line: "On-chain timers pay yield and run market cycles." },
];

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
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const preloaderRef = useRef<HTMLDivElement>(null);
  const loadCountRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [gl, setGl] = useState(true);

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
      // Layer labels follow the exploded parts
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
      if (counterRef.current) {
        const c = 17 + Math.floor(Math.min(1, Math.max(0, (proxy.p - 1.5) / 0.9)) * 4);
        counterRef.current.textContent = String(c).padStart(3, "0");
      }
    };

    const onPointer = (e: PointerEvent) => scene?.setPointer(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);

    const start = async () => {
      // Preloader: fonts + scene, then a curtain reveal.
      const count = { v: 0 };
      if (!reduced) root.style.overflow = "hidden";
      const counter = gsap.to(count, {
        v: 70,
        duration: 1.1,
        ease: "power2.out",
        onUpdate: () => loadCountRef.current && (loadCountRef.current.textContent = pad(Math.round(count.v)).padStart(3, "0")),
      });
      await Promise.race([document.fonts.load('400 120px "Instrument Serif"'), new Promise((r) => setTimeout(r, 2500))]);
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
      await gsap.to(count, {
        v: 100,
        duration: 0.5,
        ease: "power1.out",
        onUpdate: () => loadCountRef.current && (loadCountRef.current.textContent = String(Math.round(count.v)).padStart(3, "0")),
      });
      if (!alive) return;
      root.style.overflow = "";
      setLoaded(true);
      if (reduced) {
        scene?.render();
        return;
      }
      raf = requestAnimationFrame(frame);
      const intro = gsap.timeline();
      intro
        .to(preloaderRef.current, { yPercent: -100, duration: 1.1, ease: "expo.inOut" })
        .from("[data-word]", { yPercent: 105, duration: 1.2, ease: "expo.out", stagger: 0.08 }, "-=0.45")
        .from(canvas, { scale: 0.85, opacity: 0, duration: 1.3, ease: "expo.out" }, "<")
        .from("[data-ch1] > *", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.06 }, "-=0.9");
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
      tl.to(section, { backgroundColor: "#e2dacb", duration: 0.9 }, 0.05);
      tl.to(section, { backgroundColor: NIGHT, duration: 0.45 }, 1.2);
      // Chapter 1 → 2
      tl.to("[data-word='rial']", { xPercent: -30, opacity: 0, duration: 0.7 }, 0.05);
      tl.to("[data-word='tycoon']", { xPercent: 30, opacity: 0, duration: 0.7 }, 0.05);
      tl.to("[data-ch1]", { opacity: 0, y: -30, duration: 0.3 }, 0.12);
      tl.fromTo("[data-ch2]", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 0.6);
      tl.to("[data-ch2]", { opacity: 0, y: -30, duration: 0.25 }, 1.15);
      // Chapter 3
      tl.fromTo("[data-ch3]", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 1.62);
      tl.fromTo("[data-ch3-row]", { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.25, stagger: 0.05 }, 1.66);
      tl.to("[data-ch3]", { opacity: 0, y: -30, duration: 0.25 }, 2.15);
      // Chapter 4
      tl.fromTo("[data-ch4]", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 2.6);
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

  return (
    <section
      ref={sectionRef}
      id="intro"
      aria-label="RialTycoon welcome"
      className={`grain relative overflow-hidden ${stacked ? "" : "h-dvh"}`}
      style={{ backgroundColor: IVORY }}
    >
      {/* Giant words behind the coin */}
      <div aria-hidden="true" className={`pointer-events-none select-none ${stacked ? "absolute inset-x-0 top-0 h-dvh" : "absolute inset-0"}`} style={{ color: INK }}>
        <div className="absolute left-[3vw] top-[11vh] overflow-hidden md:top-[8vh]">
          <span data-word="rial" className="block font-display text-[34vw] leading-[0.8] tracking-[-0.04em] md:text-[24vw]">
            Rial
          </span>
        </div>
        <div className="absolute bottom-[30vh] right-[3vw] overflow-hidden md:bottom-[6vh]">
          <span data-word="tycoon" className="block font-display text-[30vw] italic leading-[0.8] tracking-[-0.04em] md:text-[20vw]">
            Tycoon
          </span>
        </div>
      </div>

      {/* WebGL vault */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`${stacked ? "absolute inset-x-0 top-0 h-dvh w-full" : "absolute inset-0 h-full w-full"} ${gl ? "" : "hidden"}`}
      />
      {!gl && <FallbackCoin />}

      {/* Labels that track the exploded layers */}
      {!stacked && (
        <div ref={labelsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 hidden opacity-0 md:block" style={{ color: INK }}>
          {LAYER_LABELS.map((l, i) => (
            <div key={l.key} className="absolute left-0 top-0 will-change-transform">
              <div className="-translate-x-1/2 -translate-y-full text-center" style={{ marginTop: i % 2 ? 0 : -44 }}>
                <p className="whitespace-nowrap font-display text-xl leading-none">{l.title}</p>
                <p className="eyebrow mt-1 whitespace-nowrap !text-[9px] opacity-70">{l.detail}</p>
                <div className="mx-auto mt-1.5 w-px bg-current opacity-40" style={{ height: i % 2 ? 24 : 68 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chapters */}
      <Chapter index={0} active={active} stacked={stacked} dark={false}>
        <div data-ch1 className="flex h-full min-h-[calc(100dvh-6rem)] flex-col justify-end pb-32 md:pb-24">
          <div className="max-w-sm">
            <p className="eyebrow">Vault 001 — Real-world assets, on-chain</p>
            <p className="mt-3 hidden text-base leading-snug md:block md:text-lg">
              A GameFi tycoon on Rialo. Trade gold, oil and city property as world events move the market.
            </p>
            <p className="eyebrow mt-5">Scroll to open the vault ↓</p>
            <p className="eyebrow mt-1.5 opacity-60">Illustration · every figure in this intro is a demo</p>
          </div>
        </div>
      </Chapter>

      <Chapter index={1} active={active} stacked={stacked} dark={false}>
        <div data-ch2 className="pt-24 md:pt-28">
          <p className="eyebrow">02 — Inside the vault</p>
          <h2 className="mt-3 font-display text-5xl leading-[0.95] md:text-6xl">
            Eight real-world assets.
            <br />
            <em>One mechanism.</em>
          </h2>
          <p className="mt-4 max-w-sm text-sm opacity-75">Every layer is an asset class you can trade. Every world event turns a gear.</p>
          {(
            <ul className={`mt-6 grid grid-cols-2 gap-3 ${stacked ? "" : "md:hidden"}`}>
              {LAYER_LABELS.map((l) => (
                <li key={l.key} className="border-t border-current/20 pt-3">
                  <p className="font-display text-xl leading-tight md:text-2xl">{l.title}</p>
                  <p className="eyebrow mt-1 !text-[9px] opacity-70">{l.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Chapter>

      <Chapter index={2} active={active} stacked={stacked} dark>
        <div data-ch3 className="flex h-full flex-col justify-center py-24">
          <p className="eyebrow text-gold">03 — Why Rialo</p>
          <h2 className="mt-3 max-w-2xl font-display text-5xl leading-[0.95] md:text-7xl">
            A chain that reaches <em className="text-gold">the real world.</em>
          </h2>
          <ul className="mt-8 max-w-2xl divide-y divide-white/10 border-y border-white/10">
            {RIALO_ADVANTAGES.map((a, i) => (
              <li key={a.title} data-ch3-row className="grid grid-cols-[40px_1fr] gap-3 py-3 md:grid-cols-[48px_220px_1fr] md:items-baseline">
                <span className="font-mono text-xs text-gold">{pad(i + 1)}</span>
                <span className="font-display text-2xl">{a.title}</span>
                <span className="col-start-2 text-sm text-white/60 md:col-start-3">{a.line}</span>
              </li>
            ))}
          </ul>
          <p className="eyebrow mt-4 opacity-50">Rialo is its own SVM-compatible Layer 1 by Subzero Labs</p>
          {!stacked && (
            <div className="pointer-events-none absolute bottom-16 right-10 hidden text-right md:block">
              <p className="eyebrow opacity-50">Market cycle · demo</p>
              <span ref={counterRef} className="block font-display text-[26vw] leading-[0.8] text-white/90 md:text-[13vw]">
                017
              </span>
            </div>
          )}
        </div>
      </Chapter>

      <Chapter index={3} active={active} stacked={stacked} dark>
        <div data-ch4 className="flex h-full flex-col justify-end pb-32 md:justify-center md:pb-0">
          <div className="max-w-xl">
            <p className="eyebrow text-gold">04 — Sign in and play</p>
            <h2 className="mt-3 font-display text-5xl leading-[0.95] md:text-7xl">
              Your Google account <em className="text-gold">is the key.</em>
            </h2>
            <p className="mt-4 max-w-md text-sm text-white/70 md:text-base">
              No seed phrase, no extension, no gas pop-ups. An embedded wallet is created for you, with a 10,000 $RIALO devnet grant to
              start (simulated).
            </p>
            <div className="mt-7">
              <GoogleButton size="lg" />
            </div>
            <div className="mt-7 grid max-w-md gap-4 text-sm sm:grid-cols-2">
              <p className="flex gap-2.5 text-white/70">
                <KeyIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>
                  <span className="text-white">Passkey</span> protects large sells, bids, withdrawals and export.
                </span>
              </p>
              <p className="flex gap-2.5 text-white/70">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>
                  <span className="text-white">Authenticator app</span> as fallback. Small trades stay instant.
                </span>
              </p>
            </div>
          </div>
        </div>
      </Chapter>

      {/* HUD */}
      <div className="absolute inset-x-0 top-0 z-40 text-white mix-blend-difference">
        {!stacked && (
          <div className="h-[2px] w-full bg-white/20">
            <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-4 md:px-10">
          <span className="font-display text-2xl leading-none">RialTycoon</span>
          <button onClick={skip} className="eyebrow rounded-full border border-white/50 px-4 py-2 hover:bg-white hover:text-black">
            Skip intro ↓
          </button>
        </div>
      </div>
      {!stacked && (
        <div className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-between px-5 pb-24 text-white mix-blend-difference md:px-10 md:pb-7">
          <span className="font-mono text-xs tracking-[0.2em]" aria-live="polite" data-hud-counter>
            {pad(active + 1)} / {pad(CHAPTERS)}
          </span>
          <nav aria-label="Intro chapters" className="flex gap-2">
            {Array.from({ length: CHAPTERS }, (_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to chapter ${i + 1}`}
                aria-current={active === i}
                className={`h-[3px] rounded-full transition-all duration-300 ${active === i ? "w-10 bg-white" : "w-5 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </nav>
          <span className="w-16" />
        </div>
      )}

      {/* Preloader */}
      {!loaded && reduced !== true && (
        <div ref={preloaderRef} className="fixed inset-0 z-[90] flex flex-col justify-between p-5 md:p-10" style={{ backgroundColor: INK, color: IVORY }} aria-label="Loading RialTycoon">
          <span className="font-display text-2xl">RialTycoon</span>
          <div className="flex items-end justify-between">
            <span className="eyebrow opacity-60">Opening the vault</span>
            <span ref={loadCountRef} className="font-display text-[22vw] leading-[0.8] md:text-[12vw]">
              000
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function Chapter({ index, active, stacked, dark, children }: { index: number; active: number; stacked: boolean; dark: boolean; children: ReactNode }) {
  const isActive = stacked || index === active;
  const style: CSSProperties = stacked
    ? { color: dark ? IVORY : INK, backgroundColor: dark ? NIGHT : "transparent" }
    : { color: dark ? IVORY : INK, visibility: isActive ? "visible" : "hidden", pointerEvents: isActive ? "auto" : "none" };
  return (
    <div
      id={`chapter-${index + 1}`}
      inert={!isActive}
      aria-hidden={!isActive}
      className={stacked ? "relative z-20 min-h-dvh py-24" : "absolute inset-0 z-20"}
      style={style}
    >
      <div className="relative mx-auto h-full w-full max-w-7xl px-5 md:px-10">{children}</div>
    </div>
  );
}

function FallbackCoin() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div
        className="h-60 w-60 rounded-full md:h-80 md:w-80"
        style={{
          background: "radial-gradient(circle at 35% 30%, #fff3c8 0%, #e8b84a 35%, #9a7222 75%, #5c4210 100%)",
          boxShadow: "0 40px 80px rgba(80,50,0,0.35), inset 0 0 0 12px rgba(255,255,255,0.1)",
        }}
      />
    </div>
  );
}
