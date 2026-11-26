// Static game data. Every number here is a SIMULATION input, not market data.

export type AssetClassId = "metals" | "energy-agri" | "markets" | "income";

export interface AssetClass {
  id: AssetClassId;
  name: string;
  risk: "Low" | "Medium" | "High";
  /** Standard deviation of the random price move per cycle (fraction). */
  volatility: number;
  /** Yield paid per cycle on held value (fraction). */
  yieldPerCycle: number;
}

export const ASSET_CLASSES: Record<AssetClassId, AssetClass> = {
  metals: { id: "metals", name: "Metals", risk: "Medium", volatility: 0.02, yieldPerCycle: 0.002 },
  "energy-agri": { id: "energy-agri", name: "Energy & Agriculture", risk: "High", volatility: 0.04, yieldPerCycle: 0 },
  markets: { id: "markets", name: "Financial Markets", risk: "Medium", volatility: 0.025, yieldPerCycle: 0.004 },
  income: { id: "income", name: "Income", risk: "Low", volatility: 0.012, yieldPerCycle: 0.01 },
};

export type AssetId = "GOLD" | "OIL" | "SPX" | "EURUSD" | "UST10Y" | "SCBD" | "COFFEE" | "COPPER";

export interface AssetDef {
  id: AssetId;
  name: string;
  ticker: string;
  classId: AssetClassId;
  startPrice: number;
}

export const ASSETS: AssetDef[] = [
  { id: "GOLD", name: "Gold", ticker: "xGOLD", classId: "metals", startPrice: 236 },
  { id: "OIL", name: "Oil", ticker: "xOIL", classId: "energy-agri", startPrice: 78 },
  { id: "SPX", name: "S&P 500", ticker: "xSPX", classId: "markets", startPrice: 512 },
  { id: "EURUSD", name: "EUR/USD", ticker: "xEUR", classId: "markets", startPrice: 108 },
  { id: "UST10Y", name: "US 10Y Bonds", ticker: "xUST", classId: "income", startPrice: 96 },
  { id: "SCBD", name: "SCBD Property", ticker: "xSCBD", classId: "income", startPrice: 420 },
  { id: "COFFEE", name: "Coffee", ticker: "xCOF", classId: "energy-agri", startPrice: 42 },
  { id: "COPPER", name: "Copper", ticker: "xCOP", classId: "metals", startPrice: 92 },
];

export const ASSET_BY_ID = Object.fromEntries(ASSETS.map((a) => [a.id, a])) as Record<AssetId, AssetDef>;

export type EventSource = "Geopolitics" | "Economy" | "Climate" | "Technology" | "Markets";

export interface WorldEvent {
  id: string;
  source: EventSource;
  title: string;
  /** Price impact per asset, as a fraction (0.09 = +9%). */
  impact: Partial<Record<AssetId, number>>;
}

export const WORLD_EVENTS: WorldEvent[] = [
  { id: "strait", source: "Geopolitics", title: "Shipping lanes disrupted in a key oil strait", impact: { OIL: 0.09, GOLD: 0.03, SPX: -0.02 } },
  { id: "hike", source: "Economy", title: "Central bank raises interest rates", impact: { UST10Y: -0.04, SCBD: -0.05, SPX: -0.03, EURUSD: 0.015 } },
  { id: "cut", source: "Economy", title: "Central bank cuts interest rates", impact: { UST10Y: 0.04, SCBD: 0.05, SPX: 0.03, GOLD: 0.02 } },
  { id: "jakarta", source: "Economy", title: "Jakarta CBD office demand surges", impact: { SCBD: 0.07 } },
  { id: "frost", source: "Climate", title: "Frost hits Brazil's coffee crop", impact: { COFFEE: 0.12 } },
  { id: "ev", source: "Technology", title: "Global EV battery boom", impact: { COPPER: 0.08 } },
  { id: "opec", source: "Geopolitics", title: "Oil producers agree to raise output", impact: { OIL: -0.08 } },
  { id: "cpi", source: "Economy", title: "Inflation print beats forecasts", impact: { GOLD: 0.04, UST10Y: -0.03 } },
  { id: "earnings", source: "Markets", title: "Big tech earnings beat expectations", impact: { SPX: 0.05 } },
  { id: "euro", source: "Economy", title: "Eurozone growth surprises to the upside", impact: { EURUSD: 0.025 } },
  { id: "haven", source: "Geopolitics", title: "Border tensions spark a safe-haven rush", impact: { GOLD: 0.06, SPX: -0.04, OIL: 0.03 } },
  { id: "property", source: "Economy", title: "Asian property slowdown deepens", impact: { COPPER: -0.06, SCBD: -0.02 } },
  { id: "harvest", source: "Climate", title: "Bumper harvest season for coffee growers", impact: { COFFEE: -0.08 } },
  { id: "recession", source: "Economy", title: "Recession fears grip global markets", impact: { SPX: -0.06, COPPER: -0.04, UST10Y: 0.03, GOLD: 0.03 } },
];

export interface TierDef {
  name: string;
  minNetWorth: number;
}

export const STARTING_GRANT = 10_000;
export const NET_WORTH_TARGET = 25_000;

export const TIERS: TierDef[] = [
  { name: "Intern", minNetWorth: 0 },
  { name: "Trader", minNetWorth: 12_000 },
  { name: "Broker", minNetWorth: 15_000 },
  { name: "Mogul", minNetWorth: 20_000 },
  { name: "Tycoon", minNetWorth: NET_WORTH_TARGET },
];

export const RIVALS = [
  { id: "r1", name: "Aria Vault", style: 0.035 },
  { id: "r2", name: "Bram Holdings", style: 0.02 },
  { id: "r3", name: "Citra Capital", style: 0.045 },
  { id: "r4", name: "Dax Ledger", style: 0.015 },
  { id: "r5", name: "Elio Reserve", style: 0.03 },
];

export const RARE_ITEM = {
  id: "gilded-vault-deed",
  name: "Gilded Vault Deed #001",
  description: "Cosmetic gold vault skin plus a small buff: +0.1% yield per cycle on Metals.",
  minBid: 500,
  bidStep: 50,
  yieldBuff: 0.001,
};
