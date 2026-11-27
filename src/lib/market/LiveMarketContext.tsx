"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLiveMarket } from "./useLiveMarket";

type Live = ReturnType<typeof useLiveMarket>;
const Ctx = createContext<Live | null>(null);

/** One shared live feed (server snapshot + Coinbase stream) for every component on a page. */
export function LiveMarketProvider({ children }: { children: ReactNode }) {
  const live = useLiveMarket(true);
  return <Ctx.Provider value={live}>{children}</Ctx.Provider>;
}

export function useSharedMarket() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSharedMarket must be used inside <LiveMarketProvider>");
  return v;
}
