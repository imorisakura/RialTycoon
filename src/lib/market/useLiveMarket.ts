"use client";

import { useEffect, useRef, useState } from "react";
import { LIVE_ASSETS, type LiveQuote, type MarketPayload, type NewsItem } from "./universe";

const POLL_MS = 20_000;
const COINBASE_WS = "wss://ws-feed.exchange.coinbase.com";

export type StreamState = "connecting" | "live" | "off";

/**
 * Live quotes: polls the server snapshot (CoinGecko + Finnhub, keys server-side)
 * and overlays real-time crypto ticks from Coinbase's public WebSocket (no key).
 */
export function useLiveMarket(enabled = true) {
  const [market, setMarket] = useState<MarketPayload | null>(null);
  const [ticks, setTicks] = useState<Record<string, LiveQuote>>({});
  const [stream, setStream] = useState<StreamState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Record<string, LiveQuote>>({});

  // Server snapshot
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market", { cache: "no-store" });
        if (!res.ok) throw new Error(`Market data request failed (${res.status})`);
        const data = (await res.json()) as MarketPayload;
        if (alive) {
          setMarket(data);
          setError(null);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    void load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled]);

  // Coinbase real-time ticks (24/7). Each product is subscribed separately so one unlisted pair cannot fail the rest.
  useEffect(() => {
    if (!enabled || typeof WebSocket === "undefined") return;
    const products = LIVE_ASSETS.filter((a) => a.coinbase);
    const byProduct = Object.fromEntries(products.map((a) => [a.coinbase!, a.id]));
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let closed = false;

    const flush = setInterval(() => {
      const batch = pending.current;
      if (!Object.keys(batch).length) return;
      pending.current = {};
      setTicks((t) => ({ ...t, ...batch }));
    }, 1000);

    const connect = () => {
      setStream("connecting");
      try {
        ws = new WebSocket(COINBASE_WS);
      } catch {
        setStream("off");
        return;
      }
      ws.onopen = () => {
        attempts = 0;
        for (const p of products) ws?.send(JSON.stringify({ type: "subscribe", product_ids: [p.coinbase], channels: ["ticker"] }));
      };
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data as string) as { type: string; product_id?: string; price?: string; open_24h?: string; time?: string };
          if (m.type !== "ticker" || !m.product_id || !m.price) return;
          const id = byProduct[m.product_id];
          const price = Number(m.price);
          const open = Number(m.open_24h);
          if (!id || !Number.isFinite(price)) return;
          setStream("live");
          pending.current[id] = {
            id,
            price,
            change: open ? price / open - 1 : 0,
            source: "coinbase",
            asOf: m.time ? Date.parse(m.time) : Date.now(),
          };
        } catch {}
      };
      ws.onclose = () => {
        if (closed) return;
        setStream("off");
        attempts += 1;
        if (attempts <= 5) retry = setTimeout(connect, Math.min(30_000, 2000 * 2 ** attempts));
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      closed = true;
      clearInterval(flush);
      clearTimeout(retry);
      ws?.close();
    };
  }, [enabled]);

  const quotes: Record<string, LiveQuote> = { ...(market?.quotes ?? {}) };
  for (const [id, t] of Object.entries(ticks)) {
    const base = quotes[id];
    // A Coinbase tick wins over an older snapshot or a SIM fallback.
    if (!base || base.source === "sim" || t.asOf >= base.asOf) quotes[id] = t;
  }
  return { market, quotes, stream, error };
}

export function useMarketNews(enabled = true) {
  const [news, setNews] = useState<{ items: NewsItem[]; configured: boolean } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () =>
      fetch("/api/news", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => alive && setNews(d))
        .catch(() => {});
    void load();
    const t = setInterval(load, 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled]);
  return news;
}
