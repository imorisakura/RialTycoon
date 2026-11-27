"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge, Modal } from "@/components/ui/Modal";
import { AuthContext, markLoginIntent, type AuthApi, type AuthUser, type MfaMethod } from "./context";

/**
 * SIMULATED sign-in for UI review only, used when NEXT_PUBLIC_PRIVY_APP_ID is not set.
 * No Google OAuth happens here and it must never be presented as real sign-in.
 */
const KEY = "rt-sim-auth";
const TOTP_TTL_MS = 5 * 60 * 1000;
const TOTP_MAX_ATTEMPTS = 4;

interface SimState {
  user: AuthUser | null;
  enrolled: MfaMethod[];
}

const randomHex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");

export function SimAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<SimState>({ user: null, enrolled: [] });
  const [signInOpen, setSignInOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const enrollDone = useRef<(() => void) | null>(null);
  const verifyDone = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const save = useCallback((next: SimState) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const completeSignIn = () => {
    setSignInOpen(false);
    const user: AuthUser = {
      id: "sim-user-demo",
      googleSub: "sim-sub-000000000000000000000",
      name: "Demo Player",
      email: "demo.player@example.com",
      address: null,
    };
    save({ ...state, user });
    // The embedded wallet appears after login, not during it.
    setTimeout(() => save({ ...state, user: { ...user, address: `0x${randomHex(40)}` } }), 900);
  };

  const api = useMemo<AuthApi>(
    () => ({
      mode: "simulated",
      ready,
      authenticated: !!state.user,
      user: state.user,
      login: () => {
        markLoginIntent();
        setSignInOpen(true);
      },
      logout: async () => save({ ...state, user: null }),
      verifySession: async () => ({ verified: false, detail: "Simulated sign-in: no Google id_token exists to verify" }),
      mfa: {
        enrolled: state.enrolled,
        enroll: () =>
          new Promise<void>((resolve) => {
            enrollDone.current = resolve;
            setEnrollOpen(true);
          }),
        verify: () =>
          new Promise<boolean>((resolve) => {
            verifyDone.current = resolve;
            setVerifyOpen(true);
          }),
      },
      exportWallet: async () => {
        alert("Simulated wallet: there is no real key to export. With a Privy app ID this opens Privy's secure export modal.");
      },
    }),
    [ready, state, save],
  );

  return (
    <AuthContext.Provider value={api}>
      {children}

      <Modal open={signInOpen} onClose={() => setSignInOpen(false)} title="Simulated sign-in">
        <div className="space-y-4 text-sm text-muted">
          <Badge tone="warn">UI review only, no Google OAuth</Badge>
          <p>
            No Privy app ID is configured, so this is a <strong className="text-ink">simulated sign-in</strong>. Nothing is
            sent to Google and no real account or wallet is created.
          </p>
          <p>
            Set <code className="text-gold">NEXT_PUBLIC_PRIVY_APP_ID</code> in <code>.env.local</code> to switch to the real
            Google sign-in through Privy.
          </p>
          <button onClick={completeSignIn} className="w-full rounded-control bg-gold px-4 py-3 font-semibold text-black hover:bg-gold-bright">
            Continue as Demo Player (simulated)
          </button>
        </div>
      </Modal>

      <SimEnrollModal
        open={enrollOpen}
        enrolled={state.enrolled}
        onClose={() => {
          setEnrollOpen(false);
          enrollDone.current?.();
        }}
        onEnroll={(m) => save({ ...state, enrolled: Array.from(new Set([...state.enrolled, m])) })}
        onRemove={(m) => save({ ...state, enrolled: state.enrolled.filter((x) => x !== m) })}
      />

      <SimVerifyModal
        open={verifyOpen}
        enrolled={state.enrolled}
        onDone={(ok) => {
          setVerifyOpen(false);
          verifyDone.current?.(ok);
          verifyDone.current = null;
        }}
      />
    </AuthContext.Provider>
  );
}

function SimEnrollModal({
  open,
  enrolled,
  onClose,
  onEnroll,
  onRemove,
}: {
  open: boolean;
  enrolled: MfaMethod[];
  onClose: () => void;
  onEnroll: (m: MfaMethod) => void;
  onRemove: (m: MfaMethod) => void;
}) {
  const row = (m: MfaMethod, label: string, hint: string) => (
    <div className="flex items-center justify-between gap-3 rounded-panel border border-line p-3">
      <div>
        <p className="font-medium text-ink">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {enrolled.includes(m) ? (
        <button onClick={() => onRemove(m)} className="rounded-control border border-line px-3 py-1.5 text-xs text-muted hover:text-ink">
          Remove
        </button>
      ) : (
        <button onClick={() => onEnroll(m)} className="rounded-control bg-gold px-3 py-1.5 text-xs font-semibold text-black">
          Enroll
        </button>
      )}
    </div>
  );
  return (
    <Modal open={open} onClose={onClose} title="Set up 2FA (simulated)">
      <div className="space-y-3 text-sm">
        <Badge tone="warn">Simulation</Badge>
        {row("passkey", "Passkey (recommended)", "Face ID, Touch ID, Windows Hello or a security key")}
        {row("totp", "Authenticator app (TOTP)", "Fallback: 6-digit codes from an authenticator app")}
        <p className="text-xs text-muted">SMS is disabled for RialTycoon because of SIM-swap risk.</p>
        <button onClick={onClose} className="w-full rounded-control border border-line px-4 py-2.5 text-ink hover:border-gold/50">
          Done
        </button>
      </div>
    </Modal>
  );
}

function SimVerifyModal({ open, enrolled, onDone }: { open: boolean; enrolled: MfaMethod[]; onDone: (ok: boolean) => void }) {
  const [method, setMethod] = useState<MfaMethod>("passkey");
  const [challenge, setChallenge] = useState<{ code: string; expires: number; attempts: number } | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setMethod(enrolled.includes("passkey") ? "passkey" : "totp");
    setChallenge(null);
    setInput("");
    setError("");
  }, [open, enrolled]);

  const startTotp = () => {
    setChallenge({ code: String(Math.floor(100000 + Math.random() * 900000)), expires: Date.now() + TOTP_TTL_MS, attempts: 0 });
    setInput("");
    setError("");
  };

  const submitTotp = () => {
    if (!challenge) return;
    if (Date.now() > challenge.expires) return setError("Code expired. Start a new challenge.");
    if (challenge.attempts >= TOTP_MAX_ATTEMPTS) return setError("Too many wrong attempts. Start a new challenge.");
    if (input.trim() === challenge.code) return onDone(true);
    const attempts = challenge.attempts + 1;
    setChallenge({ ...challenge, attempts });
    setError(
      attempts >= TOTP_MAX_ATTEMPTS
        ? "Too many wrong attempts. Start a new challenge."
        : `Wrong code. ${TOTP_MAX_ATTEMPTS - attempts} attempt(s) left.`,
    );
  };

  return (
    <Modal open={open} onClose={() => onDone(false)} title="Verify it's you (simulated)">
      <div className="space-y-4 text-sm text-muted">
        <Badge tone="warn">Simulation</Badge>
        {enrolled.length > 1 && (
          <div className="flex gap-2">
            {enrolled.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-control border px-3 py-1.5 text-xs ${method === m ? "border-gold text-gold" : "border-line"}`}
              >
                {m === "passkey" ? "Passkey" : "Authenticator app"}
              </button>
            ))}
          </div>
        )}
        {method === "passkey" ? (
          <button onClick={() => onDone(true)} className="w-full rounded-control bg-gold px-4 py-3 font-semibold text-black">
            Use passkey (simulated)
          </button>
        ) : !challenge ? (
          <button onClick={startTotp} className="w-full rounded-control bg-gold px-4 py-3 font-semibold text-black">
            Send me a code
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-panel border border-dashed border-gold/40 p-3 text-center">
              <p className="text-xs">Simulated authenticator app</p>
              <p className="font-mono text-2xl tracking-[0.3em] text-gold">{challenge.code}</p>
              <p className="text-[10px]">Valid for 5 minutes, 4 wrong attempts at most</p>
            </div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              aria-label="6-digit code"
              className="w-full rounded-control border border-line bg-black/30 px-3 py-2.5 font-mono text-ink outline-none focus:border-gold"
            />
            <div className="flex gap-2">
              <button onClick={submitTotp} className="flex-1 rounded-control bg-gold px-4 py-2.5 font-semibold text-black">
                Verify
              </button>
              <button onClick={startTotp} className="rounded-control border border-line px-3 py-2.5">
                New code
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-down">{error}</p>}
      </div>
    </Modal>
  );
}
