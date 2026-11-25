/** Policy-based MFA: only these actions ever ask for a second factor. */
export type SensitiveAction = "large-sell" | "auction-bid" | "withdraw" | "export-wallet" | "new-device";

export const MFA_CACHE_MS = 15 * 60 * 1000;
export const DEFAULT_LARGE_SELL_THRESHOLD = 100;

export const ACTION_COPY: Record<SensitiveAction, { title: string; why: string }> = {
  "large-sell": { title: "Large sell", why: "This sell is above your large-sell threshold." },
  "auction-bid": { title: "Auction bid", why: "Auction bids escrow your funds." },
  withdraw: { title: "Withdraw", why: "Withdrawals move funds out of your embedded wallet." },
  "export-wallet": { title: "Export wallet", why: "Exporting reveals your embedded wallet's key." },
  "new-device": { title: "New device", why: "This browser has not been used with your account before." },
};

/** Routine trades never need MFA; only sells above the threshold do. */
export const sellNeedsMfa = (sellValue: number, threshold: number) => sellValue > threshold;
