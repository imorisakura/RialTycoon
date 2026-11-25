"use client";

import { createContext, useContext } from "react";

export type MfaMethod = "passkey" | "totp";

export interface AuthUser {
  id: string;
  /** Google "sub" claim — the player's identity. */
  googleSub: string;
  name: string;
  email: string;
  avatarUrl?: string;
  /** Embedded wallet address, null until it has been created after login. */
  address: string | null;
}

export interface SessionCheck {
  verified: boolean;
  detail: string;
}

export interface AuthApi {
  /** "privy" = real Google OAuth through Privy. "simulated" = UI review only, no OAuth. */
  mode: "privy" | "simulated";
  ready: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  login: () => void;
  logout: () => Promise<void>;
  verifySession: () => Promise<SessionCheck>;
  mfa: {
    enrolled: MfaMethod[];
    enroll: () => Promise<void>;
    /** Runs the MFA challenge. Resolves true when verified. */
    verify: () => Promise<boolean>;
  };
  exportWallet: () => Promise<void>;
}

export const AuthContext = createContext<AuthApi | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <Providers>");
  return ctx;
}

export const truncate = (addr: string | null | undefined) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "Creating wallet…";

/** Remembers that the player started sign-in, so the landing page can route them into the game afterwards. */
export const LOGIN_INTENT_KEY = "rt-login-intent";
export function markLoginIntent() {
  try {
    sessionStorage.setItem(LOGIN_INTENT_KEY, "1");
  } catch {}
}
export function consumeLoginIntent() {
  try {
    const v = sessionStorage.getItem(LOGIN_INTENT_KEY);
    sessionStorage.removeItem(LOGIN_INTENT_KEY);
    return v === "1";
  } catch {
    return false;
  }
}
