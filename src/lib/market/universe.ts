/**
 * Live Market universe (~43 assets).
 * Commodities and income assets are tracked through US-listed ETFs, so their
 * moves are real market moves available on free data plans. Each one says so.
 */

export type LiveCategory = "crypto" | "stock" | "commodity" | "income";

export interface LiveAsset {
  id: string;
  name: string;
  ticker: string;
  category: LiveCategory;
  /** CoinGecko coin id (crypto). */
  coingeckoId?: string;
  /** Coinbase Exchange product id for real-time ticks (crypto, when listed). */
  coinbase?: string;
  /** Finnhub symbol (stocks and ETFs). */
  finnhub?: string;
  /** What the price actually tracks, when it is a proxy. */
  proxy?: string;
  /** Baseline used only for the clearly-labeled SIM fallback. */
  simPrice: number;
}

const c = (id: string, name: string, coingeckoId: string, simPrice: number, coinbase?: string): LiveAsset => ({
  id,
  name,
  ticker: id,
  category: "crypto",
  coingeckoId,
  coinbase,
  simPrice,
});
const s = (id: string, name: string, simPrice: number, category: LiveCategory = "stock", proxy?: string): LiveAsset => ({
  id,
  name,
  ticker: id,
  category,
  finnhub: id,
  proxy,
  simPrice,
});

export const LIVE_ASSETS: LiveAsset[] = [
  // Crypto — trades 24/7
  c("BTC", "Bitcoin", "bitcoin", 95000, "BTC-USD"),
  c("ETH", "Ethereum", "ethereum", 3500, "ETH-USD"),
  c("SOL", "Solana", "solana", 180, "SOL-USD"),
  c("BNB", "BNB", "binancecoin", 650),
  c("XRP", "XRP", "ripple", 2.2, "XRP-USD"),
  c("ADA", "Cardano", "cardano", 0.7, "ADA-USD"),
  c("DOGE", "Dogecoin", "dogecoin", 0.2, "DOGE-USD"),
  c("TRX", "TRON", "tron", 0.25),
  c("AVAX", "Avalanche", "avalanche-2", 30, "AVAX-USD"),
  c("LINK", "Chainlink", "chainlink", 18, "LINK-USD"),
  c("DOT", "Polkadot", "polkadot", 5, "DOT-USD"),
  c("TON", "Toncoin", "the-open-network", 4),
  c("SUI", "Sui", "sui", 3.5, "SUI-USD"),
  c("LTC", "Litecoin", "litecoin", 95, "LTC-USD"),
  c("NEAR", "NEAR Protocol", "near", 4, "NEAR-USD"),
  c("UNI", "Uniswap", "uniswap", 9, "UNI-USD"),
  c("ATOM", "Cosmos", "cosmos", 6, "ATOM-USD"),
  c("APT", "Aptos", "aptos", 7, "APT-USD"),
  c("PAXG", "PAX Gold (tokenized gold)", "pax-gold", 2600, "PAXG-USD"),
  c("ONDO", "Ondo (RWA)", "ondo-finance", 1.1, "ONDO-USD"),
  // US stocks & index ETFs — US market hours
  s("AAPL", "Apple", 230),
  s("MSFT", "Microsoft", 430),
  s("NVDA", "NVIDIA", 140),
  s("GOOGL", "Alphabet", 175),
  s("AMZN", "Amazon", 200),
  s("META", "Meta Platforms", 580),
  s("TSLA", "Tesla", 300),
  s("JPM", "JPMorgan Chase", 230),
  s("V", "Visa", 300),
  s("NFLX", "Netflix", 800),
  s("AMD", "AMD", 140),
  s("COIN", "Coinbase", 250),
  s("SPY", "S&P 500 (SPY ETF)", 590, "stock", "S&P 500 index via the SPY ETF"),
  s("QQQ", "Nasdaq-100 (QQQ ETF)", 510, "stock", "Nasdaq-100 index via the QQQ ETF"),
  // Commodities via ETFs
  s("GLD", "Gold", 245, "commodity", "Gold via the GLD ETF"),
  s("SLV", "Silver", 28, "commodity", "Silver via the SLV ETF"),
  s("USO", "Crude oil", 75, "commodity", "WTI crude via the USO ETF"),
  s("UNG", "Natural gas", 15, "commodity", "US natural gas via the UNG ETF"),
  s("CPER", "Copper", 27, "commodity", "Copper via the CPER ETF"),
  s("DBA", "Agriculture", 26, "commodity", "Agriculture basket (incl. coffee) via the DBA ETF"),
  // Income & FX via ETFs
  s("IEF", "US 7–10Y Treasuries", 95, "income", "US 7–10 year Treasuries via the IEF ETF"),
  s("VNQ", "US Real Estate", 90, "income", "US real estate (REITs) via the VNQ ETF"),
  s("FXE", "Euro (EUR/USD)", 100, "income", "EUR/USD via the FXE ETF"),
];

export const LIVE_BY_ID = Object.fromEntries(LIVE_ASSETS.map((a) => [a.id, a])) as Record<string, LiveAsset>;

export const CATEGORY_LABEL: Record<LiveCategory, string> = {
  crypto: "Crypto",
  stock: "Stocks",
  commodity: "Commodities",
  income: "Income & FX",
};

export type QuoteSource = "coingecko" | "coinbase" | "finnhub" | "sim";

export interface LiveQuote {
  id: string;
  price: number;
  /** Change vs previous close (stocks/ETFs) or over 24h (crypto), as a fraction. */
  change: number;
  source: QuoteSource;
  /** Epoch ms of the quote. */
  asOf: number;
}

export interface MarketPayload {
  quotes: Record<string, LiveQuote>;
  usMarketOpen: boolean;
  providers: { coingecko: boolean; finnhub: boolean };
  updatedAt: number;
}

export interface NewsItem {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  category: string;
}

/** Regular US session: Mon–Fri 09:30–16:00 America/New_York (exchange holidays not modelled). */
export function isUsMarketOpen(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday");
  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  return !["Sat", "Sun"].includes(day) && minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

export const tradesAroundTheClock = (a: LiveAsset) => a.category === "crypto";
