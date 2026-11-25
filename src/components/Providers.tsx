"use client";

import type { ReactNode } from "react";
import { PrivyAuthProvider } from "@/lib/auth/privy-auth";
import { SimAuthProvider } from "@/lib/auth/sim-auth";
import { MfaGateProvider } from "@/lib/mfa/gate";
import { ToastProvider } from "@/components/ui/Toasts";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function Providers({ children }: { children: ReactNode }) {
  const inner = (
    <ToastProvider>
      <MfaGateProvider>{children}</MfaGateProvider>
    </ToastProvider>
  );
  // Without an app ID we fall back to a clearly-labeled simulated sign-in (UI review only).
  return PRIVY_APP_ID ? (
    <PrivyAuthProvider appId={PRIVY_APP_ID}>{inner}</PrivyAuthProvider>
  ) : (
    <SimAuthProvider>{inner}</SimAuthProvider>
  );
}
