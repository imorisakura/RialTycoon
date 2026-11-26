"use client";

import { useEffect, useState } from "react";
import { ASSETS, type AssetId } from "@/lib/game/data";

export interface DemoQuote {
  id: AssetId;
  name: string;
  ticker: string;
  price: number;
  change: number;
  points: number[];
}

function seed(): DemoQuote[] {
  return ASSETS.map((a, i) => {
    const pts = [a.startPrice];
    for (let k = 0; k < 15; k++) pts.push(pts[pts.length - 1] * (1 + Math.sin(i * 7 + k) * 0.012));
    return { id: a.id, name: a.name, ticker: a.ticker, price: pts[pts.length - 1], change: pts[pts.length - 1] / pts[0] - 1, points: pts };
  });
}

/** Demo-only price wiggle for the landing page. Labeled DEMO in the UI. Never real data. */
export function useDemoPrices(intervalMs = 2200) {
  const [quotes, setQuotes] = useState<DemoQuote[]>(seed);
  useEffect(() => {
    const t = setInterval(() => {
      setQuotes((qs) =>
        qs.map((q) => {
          const price = Math.max(1, q.price * (1 + (Math.random() - 0.48) * 0.012));
          const points = [...q.points.slice(1), price];
          return { ...q, price, points, change: price / points[0] - 1 };
        }),
      );
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return quotes;
}
