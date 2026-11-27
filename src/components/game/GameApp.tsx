"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Modal } from "@/components/ui/Modal";
import { truncate, useAuth, type SessionCheck } from "@/lib/auth/context";
import { useMfaGate } from "@/lib/mfa/gate";
import { KeyIcon, ShieldIcon } from "@/components/ui/Icons";
import { CoinMark } from "@/components/landing/Landing";
import { netWorthOf, useGame } from "@/lib/game/store";
import { RialoInfoModal, SimBadge, TargetBar } from "./bits";
import { useLive } from "@/lib/game/live-store";
import { useLiveMarket } from "@/lib/market/useLiveMarket";
import { LiveDashboard, LivePortfolio, LivePricesBadge, LiveStatus } from "./LiveTerminal";
import { Dashboard } from "./Dashboard";
import { AuctionTab, LeaderboardTab, PortfolioTab } from "./Tabs";

type Mode = "live" | "season";
const TABS = {
  live: ["Markets", "Portfolio"],
  season: ["Dashboard", "Portfolio", "Auction", "Leaderboard"],
} as const;
type Tab = (typeof TABS)[Mode][number];
const MODE_KEY = "rt-mode";

export function GameApp() {
  const auth = useAuth();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated || !auth.ready) {
    return <div className="grid min-h-dvh place-items-center text-muted">Loading RialTycoon…</div>;
  }
  if (!auth.authenticated || !auth.user) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-bold">Sign in to play RialTycoon</h1>
          <p className="mt-2 text-muted">Your Google account is your key. An embedded wallet is created for you.</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <GoogleButton size="lg" />
            <Link href="/" className="text-sm text-muted hover:text-ink">
              ← Back to the intro
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return <Terminal />;
}

function Terminal() {
  const auth = useAuth();
  const user = auth.user!;
  const ownerId = useGame((s) => s.ownerId);
  const ready = ownerId === user.id;
  const [mode, setModeState] = useState<Mode>("live");
  const [tab, setTab] = useState<Tab>("Markets");
  const [infoOpen, setInfoOpen] = useState(false);
  const netWorth = useGame(netWorthOf);
  const ensureLive = useLive((s) => s.ensureAccount);
  const liveData = useLiveMarket(mode === "live");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "season") {
        setModeState("season");
        setTab("Dashboard");
      }
    } catch {}
  }, []);
  useEffect(() => ensureLive(user.id), [ensureLive, user.id]);

  const setMode = (m: Mode) => {
    setModeState(m);
    setTab(TABS[m][0]);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  };

  return (
    <div className="min-h-dvh">
      <Onboarding />
      <NewDeviceCheck />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/90">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-3 py-2.5 md:px-5">
          <Link href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight">
            <CoinMark />
            RialTycoon
          </Link>
          <div role="group" aria-label="Game mode" className="flex rounded-control border border-line p-0.5 text-xs">
            {(["live", "season"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-control px-2.5 py-1 ${mode === m ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
              >
                {m === "live" ? "Live Market" : "Simulation Season"}
              </button>
            ))}
          </div>
          {mode === "season" ? <SimBadge /> : <LivePricesBadge quotes={liveData.quotes} />}
          <nav className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:ml-2 md:w-auto" aria-label="Game tabs">
            {TABS[mode].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={tab === t}
                className={`rounded-control px-3 py-1.5 text-sm ${tab === t ? "bg-panel-2 text-ink" : "text-muted hover:text-ink"}`}
              >
                {t}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setInfoOpen(true)} className="hidden rounded-control border border-line px-3 py-1.5 text-xs text-muted hover:text-ink sm:block">
              Why Rialo?
            </button>
            <Link href="/security" className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-muted hover:text-ink">
              <ShieldIcon className="h-3.5 w-3.5" /> Security
            </Link>
            <ProfileChip />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-3 px-3 py-3 md:px-5">
        <MfaNudge />
        {ready && mode === "live" ? (
          <>
            <LiveStatus data={liveData} />
            {tab === "Markets" && <LiveDashboard data={liveData} />}
            {tab === "Portfolio" && <LivePortfolio data={liveData} />}
          </>
        ) : ready ? (
          <>
            <TargetBar netWorth={netWorth} />
            {tab === "Dashboard" && <Dashboard onOpenInfo={() => setInfoOpen(true)} />}
            {tab === "Portfolio" && <PortfolioTab />}
            {tab === "Auction" && <AuctionTab />}
            {tab === "Leaderboard" && <LeaderboardTab />}
          </>
        ) : (
          <p className="py-20 text-center text-muted">Setting up your account…</p>
        )}
      </main>
      <RialoInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}

function ProfileChip() {
  const auth = useAuth();
  const user = auth.user!;
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-panel py-1 pl-1 pr-2">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-gold-bright to-gold-deep text-xs font-bold text-black" aria-hidden="true">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="hidden leading-tight sm:block">
        <p className="max-w-[140px] truncate text-xs font-medium">{user.name}</p>
        <p className="font-mono text-[10px] text-muted" title={user.address ?? undefined}>
          {truncate(user.address)}
        </p>
      </div>
      <button onClick={() => auth.logout()} className="ml-1 rounded-full px-2 py-1 text-xs text-muted hover:bg-panel-2 hover:text-ink">
        Sign out
      </button>
    </div>
  );
}

function MfaNudge() {
  const auth = useAuth();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem("rt-mfa-nudge") === "1");
    } catch {
      setDismissed(false);
    }
  }, []);
  if (auth.mfa.enrolled.length || dismissed) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-panel px-4 py-3 text-sm">
      <p>
        <KeyIcon className="mr-1.5 inline h-4 w-4 -translate-y-px text-gold" />Protect large sells, bids, withdrawals and wallet export with a <strong>passkey</strong>. It is optional, and small trades stay instant.
      </p>
      <div className="flex gap-2">
        <Link href="/security" className="rounded-control bg-gold px-3 py-1.5 font-semibold text-black">
          Set up 2FA
        </Link>
        <button
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem("rt-mfa-nudge", "1");
            } catch {}
          }}
          className="rounded-control px-3 py-1.5 text-muted hover:text-ink"
        >
          Later
        </button>
      </div>
    </div>
  );
}

type StepState = "pending" | "done" | "info";

/** Post-login onboarding: shows the sign-in pipeline and claims the faucet grant once per player. */
function Onboarding() {
  const auth = useAuth();
  const user = auth.user!;
  const ownerId = useGame((s) => s.ownerId);
  const initPlayer = useGame((s) => s.initPlayer);
  const isNew = ownerId !== user.id;
  const [open, setOpen] = useState(isNew);
  const [session, setSession] = useState<SessionCheck | null>(null);
  const [claimed, setClaimed] = useState(!isNew);

  useEffect(() => {
    if (!isNew) return;
    setOpen(true);
    auth.verifySession().then(setSession, () => setSession({ verified: false, detail: "Verification request failed" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  useEffect(() => {
    if (!isNew || !user.address) return;
    initPlayer(user.id, user.address).then(() => setClaimed(true));
  }, [isNew, user.id, user.address, initPlayer]);

  // Keep the stored address in sync if the wallet appears later.
  useEffect(() => {
    if (!isNew && user.address) void initPlayer(user.id, user.address);
  }, [isNew, user.id, user.address, initPlayer]);

  const sim = auth.mode === "simulated";
  const steps: { label: string; state: StepState; note: string }[] = [
    { label: "Google account verified", state: sim ? "info" : "done", note: sim ? "Simulated sign-in, no OAuth" : "Google OAuth / OpenID Connect via Privy" },
    {
      label: "Identity bound to Google sub",
      state: session ? (session.verified ? "done" : "info") : "pending",
      note: session ? `${session.detail}` : "Verifying session…",
    },
    { label: "Embedded wallet created", state: user.address ? "done" : "pending", note: user.address ? truncate(user.address) : "Created after login…" },
    { label: "Session key active", state: user.address ? "info" : "pending", note: "Limited session key (simulated)" },
    { label: "Devnet faucet: 10,000 $RIALO", state: claimed ? "info" : "pending", note: "Simulated grant via the mock Rialo adapter" },
  ];
  const done = claimed && !!user.address;

  return (
    <Modal open={open} onClose={() => done && setOpen(false)} title="Welcome to RialTycoon">
      <ol className="space-y-2.5">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-3">
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${s.state === "done" ? "bg-up text-black" : s.state === "info" ? "bg-gold text-black" : "border border-line text-muted"}`}>
              {s.state === "pending" ? "…" : "✓"}
            </span>
            <div>
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted">{s.note}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted">
        Gold ticks mark simulated steps. Your Google sub, not a wallet you manage, is your player identity.
      </p>
      <button
        disabled={!done}
        onClick={() => setOpen(false)}
        className="mt-4 w-full rounded-control bg-gold px-4 py-3 font-semibold text-black disabled:opacity-50"
      >
        {done ? "Enter the terminal" : "Setting up…"}
      </button>
    </Modal>
  );
}

/** Sign-in on a new device asks for MFA, but only if the player has enrolled MFA. Device trust lives in this browser. */
function NewDeviceCheck() {
  const auth = useAuth();
  const gate = useMfaGate();
  const user = auth.user!;
  const enrolled = auth.mfa.enrolled.length > 0;
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;
    setChecked(true);
    const deviceId = getDeviceId();
    const key = `rt-trusted-${user.id}`;
    let trusted: string[] = [];
    try {
      trusted = JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch {}
    if (trusted.includes(deviceId)) return;
    const trust = () => {
      try {
        localStorage.setItem(key, JSON.stringify([...trusted, deviceId]));
      } catch {}
    };
    if (!enrolled) return trust(); // Never block onboarding.
    gate.require("new-device").then((ok) => (ok ? trust() : auth.logout()));
  }, [checked, enrolled, user.id, gate, auth]);
  return null;
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem("rt-device-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("rt-device-id", id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}


