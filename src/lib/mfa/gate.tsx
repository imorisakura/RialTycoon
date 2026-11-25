"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Badge, Modal } from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth/context";
import { ACTION_COPY, MFA_CACHE_MS, type SensitiveAction } from "./policy";

interface Gate {
  /** Resolves true when the action may proceed (fresh MFA within 15 minutes, or a new successful challenge). */
  require: (action: SensitiveAction) => Promise<boolean>;
  verifiedUntil: number;
}

const GateContext = createContext<Gate | null>(null);
export const useMfaGate = () => {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error("useMfaGate must be used inside <MfaGateProvider>");
  return ctx;
};

const cacheKey = (userId: string) => `rt-mfa-verified-${userId}`;

export function MfaGateProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.user?.id;
  const [verifiedUntil, setVerifiedUntil] = useState(0);
  const [pending, setPending] = useState<SensitiveAction | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    if (!userId) return setVerifiedUntil(0);
    try {
      setVerifiedUntil(Number(sessionStorage.getItem(cacheKey(userId)) ?? 0));
    } catch {}
  }, [userId]);

  const finish = (ok: boolean) => {
    if (ok && userId) {
      const until = Date.now() + MFA_CACHE_MS;
      setVerifiedUntil(until);
      try {
        sessionStorage.setItem(cacheKey(userId), String(until));
      } catch {}
    }
    setPending(null);
    setBusy(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const requireMfa = useCallback(
    (action: SensitiveAction) => {
      if (Date.now() < verifiedUntil) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setPending(action);
      });
    },
    [verifiedUntil],
  );

  const enrolled = auth.mfa.enrolled.length > 0;
  const run = async () => {
    setBusy(true);
    if (!enrolled) await auth.mfa.enroll();
    const ok = await auth.mfa.verify();
    finish(ok);
  };

  return (
    <GateContext.Provider value={{ require: requireMfa, verifiedUntil }}>
      {children}
      <Modal open={!!pending} onClose={() => finish(false)} title={pending ? `2FA required · ${ACTION_COPY[pending].title}` : ""}>
        {pending && (
          <div className="space-y-4 text-sm text-muted">
            <p>{ACTION_COPY[pending].why} RialTycoon asks for a second factor only for sensitive actions, never for routine small trades.</p>
            {enrolled ? (
              <p>
                Verify with your {auth.mfa.enrolled.includes("passkey") ? "passkey" : "authenticator app"}. A successful check is
                remembered for 15 minutes.
              </p>
            ) : (
              <p>
                You have not set up 2FA yet. Add a <strong className="text-ink">passkey</strong> (recommended) or an{" "}
                <strong className="text-ink">authenticator app</strong> to continue.
              </p>
            )}
            {auth.mode === "simulated" && <Badge tone="warn">Simulated 2FA</Badge>}
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={run}
                className="flex-1 rounded-xl bg-gold px-4 py-2.5 font-semibold text-black disabled:opacity-60"
              >
                {busy ? "Waiting…" : enrolled ? "Verify now" : "Set up 2FA and verify"}
              </button>
              <button onClick={() => finish(false)} className="rounded-xl border border-line px-4 py-2.5 text-ink">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </GateContext.Provider>
  );
}
