"use client";

import {
  PrivyProvider,
  useExportWallet,
  useLoginWithOAuth,
  useMfa,
  useMfaEnrollment,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { useMemo, type ReactNode } from "react";
import { AuthContext, markLoginIntent, type AuthApi, type MfaMethod } from "./context";

/**
 * Real Google sign-in through Privy.
 * - loginMethods: ["google"] only. No external wallets anywhere.
 * - Embedded EVM wallet is created by Privy AFTER the first login
 *   (createOnLogin "users-without-wallets"). We never call createWallet
 *   ourselves and never create a Solana wallet, so no wallet slot gets blocked.
 * - MFA methods (Passkey, TOTP; SMS disabled) are enabled in the Privy dashboard.
 */
export function PrivyAuthProvider({ appId, children }: { appId: string; children: ReactNode }) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["google"],
        appearance: {
          theme: "dark",
          accentColor: "#E8B84A",
          landingHeader: "Sign in to RialTycoon",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          showWalletUIs: false,
        },
        mfa: { noPromptOnMfaRequired: false },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { initOAuth } = useLoginWithOAuth();
  const { promptMfa } = useMfa();
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const { exportWallet } = useExportWallet();

  const api = useMemo<AuthApi>(() => {
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    const google = user?.google;
    const enrolled = (user?.mfaMethods ?? []).filter((m): m is MfaMethod => m === "passkey" || m === "totp");
    return {
      mode: "privy",
      ready,
      authenticated,
      user: user
        ? {
            id: user.id,
            googleSub: google?.subject ?? "",
            name: google?.name ?? google?.email ?? "Player",
            email: google?.email ?? "",
            address: embedded?.address ?? user.wallet?.address ?? null,
          }
        : null,
      login: () => {
        markLoginIntent();
        void initOAuth({ provider: "google" });
      },
      logout: () => logout(),
      async verifySession() {
        const token = await getAccessToken();
        if (!token) return { verified: false, detail: "No Privy access token" };
        const res = await fetch("/api/session", { method: "POST", headers: { authorization: `Bearer ${token}` } });
        const body = (await res.json()) as { ok: boolean; error?: string };
        return body.ok
          ? { verified: true, detail: "Privy session token verified on the server (Google id_token verified by Privy)" }
          : { verified: false, detail: body.error ?? "Verification failed" };
      },
      mfa: {
        enrolled,
        enroll: () => showMfaEnrollmentModal(),
        async verify() {
          try {
            await promptMfa();
            return true;
          } catch {
            return false;
          }
        },
      },
      exportWallet: () => exportWallet(embedded ? { address: embedded.address } : undefined),
    };
  }, [ready, authenticated, user, wallets, initOAuth, logout, getAccessToken, promptMfa, showMfaEnrollmentModal, exportWallet]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}
