"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Badge } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toasts";
import { truncate, useAuth } from "@/lib/auth/context";
import { useGame } from "@/lib/game/store";
import { useMfaGate } from "@/lib/mfa/gate";
import { ACTION_COPY, MFA_CACHE_MS, type SensitiveAction } from "@/lib/mfa/policy";
import { getDeviceId } from "./GameApp";

export function SecurityCenter() {
  const auth = useAuth();
  const gate = useMfaGate();
  const toast = useToast();
  const threshold = useGame((s) => s.mfaThreshold);
  const setThreshold = useGame((s) => s.setMfaThreshold);
  const [devices, setDevices] = useState<string[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [now, setNow] = useState(0);

  const userId = auth.user?.id;
  useEffect(() => {
    if (!userId) return;
    setDeviceId(getDeviceId());
    setNow(Date.now());
    try {
      setDevices(JSON.parse(localStorage.getItem(`rt-trusted-${userId}`) ?? "[]"));
    } catch {}
  }, [userId]);

  if (!auth.ready) return <div className="grid min-h-dvh place-items-center text-muted">Loading…</div>;
  if (!auth.authenticated || !auth.user) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">Security Center</h1>
          <p className="mt-2 text-muted">Sign in to manage 2FA and devices.</p>
          <div className="mt-6">
            <GoogleButton size="lg" />
          </div>
        </div>
      </div>
    );
  }

  const enrolled = auth.mfa.enrolled;
  const revokeOthers = () => {
    const keep = devices.filter((d) => d === deviceId);
    localStorage.setItem(`rt-trusted-${auth.user!.id}`, JSON.stringify(keep));
    setDevices(keep);
    toast("Other devices will need 2FA on their next sign-in.", "info");
  };
  const exportWallet = async () => {
    if (!(await gate.require("export-wallet"))) return toast("Export cancelled — 2FA not completed.", "error");
    await auth.exportWallet();
  };
  const freshFor = Math.max(0, gate.verifiedUntil - now);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/play" className="text-sm text-muted hover:text-ink">
            ← Back to the terminal
          </Link>
          <h1 className="mt-1 text-3xl font-bold">Security Center</h1>
        </div>
        {auth.mode === "simulated" && <Badge tone="warn">Simulated sign-in · UI review only</Badge>}
      </div>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-semibold">How your account is protected</h2>
        <p className="mt-2 text-sm text-muted">
          You sign in with Google and Privy creates an embedded wallet for you. Its key is split with Shamir Secret Sharing and is
          never stored whole in one place. This is a low-friction model: <strong className="text-ink">your account&apos;s safety depends on
          your Google account plus the 2FA you set up here.</strong> Turn on 2-step verification for your Google account too.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs text-muted">Signed in as</dt>
            <dd>
              {auth.user.name} <span className="text-muted">{auth.user.email}</span>
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs text-muted">Embedded wallet</dt>
            <dd className="font-mono">{truncate(auth.user.address)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Two-factor authentication</h2>
          {enrolled.length ? <Badge tone="up">On</Badge> : <Badge tone="muted">Not set up</Badge>}
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-xl border border-line p-3">
            <span>
              🔑 Passkey <span className="text-xs text-gold">recommended</span>
            </span>
            <span className="text-muted">{enrolled.includes("passkey") ? "Enrolled" : "Not enrolled"}</span>
          </li>
          <li className="flex items-center justify-between rounded-xl border border-line p-3">
            <span>⏱️ Authenticator app (TOTP) · fallback</span>
            <span className="text-muted">{enrolled.includes("totp") ? "Enrolled" : "Not enrolled"}</span>
          </li>
          <li className="flex items-center justify-between rounded-xl border border-line p-3 opacity-60">
            <span>📱 SMS</span>
            <span className="text-muted">Disabled (SIM-swap risk)</span>
          </li>
        </ul>
        <button onClick={() => auth.mfa.enroll()} className="mt-4 rounded-xl bg-gold px-4 py-2.5 font-semibold text-black">
          {enrolled.length ? "Manage 2FA methods" : "Set up 2FA"}
        </button>
        <p className="mt-2 text-xs text-muted">Optional and never forced. You can keep trading small amounts without it.</p>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-semibold">When we ask for 2FA</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {(Object.keys(ACTION_COPY) as SensitiveAction[]).map((a) => (
            <li key={a} className="rounded-xl bg-white/5 p-3">
              <p className="font-medium">{ACTION_COPY[a].title}</p>
              <p className="text-xs text-muted">{ACTION_COPY[a].why}</p>
            </li>
          ))}
        </ul>
        <label className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          Large-sell threshold
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="tabular w-28 rounded-lg border border-line bg-black/30 px-2.5 py-1.5 outline-none focus:border-gold"
          />
          <span className="text-muted">$RIALO (default 100)</span>
        </label>
        <p className="mt-3 text-xs text-muted">
          Routine buys and small sells never ask for 2FA. A successful check is remembered for {MFA_CACHE_MS / 60000} minutes
          {freshFor > 0 ? ` (fresh for about ${Math.ceil(freshFor / 60000)} more min)` : ""}. Authenticator codes are valid for 5 minutes with a
          maximum of 4 wrong attempts.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Devices</h2>
          <button onClick={revokeOthers} className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-gold">
            Revoke other devices
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {devices.length === 0 && <li className="text-muted">No trusted devices yet.</li>}
          {devices.map((d) => (
            <li key={d} className="flex justify-between rounded-xl bg-white/5 p-3">
              <span className="font-mono text-xs">{d.slice(0, 8)}…</span>
              <span className="text-xs text-muted">{d === deviceId ? "This device" : "Trusted device"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Device trust is kept in this browser for the demo. Signing in from a new device asks for 2FA once you have it set up.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => auth.logout()} className="rounded-xl border border-line px-4 py-2.5 text-sm hover:border-gold">
            Sign out of this session
          </button>
          <button onClick={exportWallet} className="rounded-xl border border-down/50 px-4 py-2.5 text-sm text-down hover:bg-down/10">
            Export wallet (2FA)
          </button>
        </div>
      </section>
    </div>
  );
}
