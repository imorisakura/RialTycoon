/**
 * Server-only market data. API keys come from server env vars and never reach the browser.
 *   COINGECKO_API_KEY — CoinGecko Demo key (header x-cg-demo-api-key)
 *   FINNHUB_API_KEY   — Finnhub key (header X-Finnhub-Token)
 * Results are cached in memory per server instance and refreshed on an
 * interval chosen to stay inside the free plans.
 */
import { LIVE_ASSETS, isUsMarketOpen, type LiveQuote, type MarketPayload, type NewsItem } from "./universe";

const CRYPTO_TTL = 10 * 60 * 1000; // ~4.3k CoinGecko calls/month per instance (Demo plan ≈10k/month)
const STOCK_TTL = 60 * 1000; // 23 Finnhub calls per minute (free plan ≈60/min)
const NEWS_TTL = 5 * 60 * 1000;

const env = () => ({ cg: process.env.COINGECKO_API_KEY ?? "", fh: process.env.FINNHUB_API_KEY ?? "" });

interface Slot<T> {
  value?: T;
  at: number;
  inflight?: Promise<T>;
}
const slots: Record<string, Slot<unknown>> = {};

/** Returns the cached value, refreshing it when older than ttl. Keeps the last good value on errors. */
async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T | undefined> {
  const slot = (slots[key] ??= { at: 0 }) as Slot<T>;
  if (slot.value !== undefined && Date.now() - slot.at < ttl) return slot.value;
  slot.inflight ??= load().finally(() => (slot.inflight = undefined));
  try {
    slot.value = await slot.inflight;
    slot.at = Date.now();
  } catch (e) {
    console.error(`[market] ${key} refresh failed:`, (e as Error).message);
  }
  return slot.value;
}

async function getJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

export async function fetchCoinGecko(key: string): Promise<Record<string, LiveQuote>> {
  const coins = LIVE_ASSETS.filter((a) => a.coingeckoId);
  const ids = coins.map((a) => a.coingeckoId).join(",");
  const data = (await getJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
    { "x-cg-demo-api-key": key, accept: "application/json" },
  )) as Record<string, { usd?: number; usd_24h_change?: number; last_updated_at?: number }>;
  const out: Record<string, LiveQuote> = {};
  for (const a of coins) {
    const row = data[a.coingeckoId!];
    if (!row?.usd) continue;
    out[a.id] = {
      id: a.id,
      price: row.usd,
      change: (row.usd_24h_change ?? 0) / 100,
      source: "coingecko",
      asOf: row.last_updated_at ? row.last_updated_at * 1000 : Date.now(),
    };
  }
  return out;
}

export async function fetchFinnhubQuotes(key: string): Promise<Record<string, LiveQuote>> {
  const symbols = LIVE_ASSETS.filter((a) => a.finnhub);
  const out: Record<string, LiveQuote> = {};
  // Small batches keep us far below Finnhub's per-second cap.
  for (let i = 0; i < symbols.length; i += 8) {
    const batch = symbols.slice(i, i + 8);
    const rows = await Promise.allSettled(
      batch.map((a) => getJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(a.finnhub!)}`, { "X-Finnhub-Token": key })),
    );
    rows.forEach((r, j) => {
      const a = batch[j];
      if (r.status !== "fulfilled") return;
      const q = r.value as { c?: number; dp?: number; t?: number };
      if (!q?.c) return; // 0 means unknown symbol or no data on this plan
      out[a.id] = { id: a.id, price: q.c, change: (q.dp ?? 0) / 100, source: "finnhub", asOf: q.t ? q.t * 1000 : Date.now() };
    });
  }
  if (!Object.keys(out).length) throw new Error("Finnhub returned no quotes");
  return out;
}

export async function fetchFinnhubNews(key: string): Promise<NewsItem[]> {
  const rows = (await getJson("https://finnhub.io/api/v1/news?category=general", { "X-Finnhub-Token": key })) as NewsItem[];
  return rows.slice(0, 25).map(({ id, headline, source, url, datetime, category }) => ({ id, headline, source, url, datetime, category }));
}

/** Clearly-labeled fallback: a slow random walk around a baseline, per server instance. */
const simState: Record<string, { price: number; open: number }> = {};
function simQuote(id: string, base: number): LiveQuote {
  const s = (simState[id] ??= { price: base, open: base });
  s.price = Math.max(base * 0.2, s.price * (1 + (Math.random() - 0.5) * 0.004));
  return { id, price: s.price, change: s.price / s.open - 1, source: "sim", asOf: Date.now() };
}

export async function getMarket(): Promise<MarketPayload> {
  const { cg, fh } = env();
  const [crypto, stocks] = await Promise.all([
    cg ? cached("coingecko", CRYPTO_TTL, () => fetchCoinGecko(cg)) : undefined,
    fh ? cached("finnhub", STOCK_TTL, () => fetchFinnhubQuotes(fh)) : undefined,
  ]);
  const quotes: Record<string, LiveQuote> = {};
  for (const a of LIVE_ASSETS) quotes[a.id] = crypto?.[a.id] ?? stocks?.[a.id] ?? simQuote(a.id, a.simPrice);
  return { quotes, usMarketOpen: isUsMarketOpen(), providers: { coingecko: !!cg, finnhub: !!fh }, updatedAt: Date.now() };
}

export async function getNews(): Promise<{ items: NewsItem[]; configured: boolean }> {
  const { fh } = env();
  if (!fh) return { items: [], configured: false };
  return { items: (await cached("news", NEWS_TTL, () => fetchFinnhubNews(fh))) ?? [], configured: true };
}
