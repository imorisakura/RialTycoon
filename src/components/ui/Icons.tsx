import type { AssetId, EventSource } from "@/lib/game/data";

type P = { className?: string };
const base = (className = "h-5 w-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

const ASSET_PATHS: Record<AssetId, React.ReactNode> = {
  // Gold bar
  GOLD: <><path d="M4 17l2.5-7h11L20 17z" /><path d="M8.5 10l1-3h5l1 3" /><path d="M4 17h16" /></>,
  // Oil barrel
  OIL: <><ellipse cx="12" cy="5.5" rx="6" ry="2" /><path d="M6 5.5v13c0 1.1 2.7 2 6 2s6-.9 6-2v-13" /><path d="M6 10c0 1.1 2.7 2 6 2s6-.9 6-2M6 14.5c0 1.1 2.7 2 6 2s6-.9 6-2" /></>,
  // Index chart
  SPX: <><path d="M3 20h18" /><path d="M4 16l4.5-5 3.5 3 6-7.5" /><path d="M15 6.5h3v3" /></>,
  // Currency pair
  EURUSD: <><circle cx="9" cy="12" r="5.5" /><path d="M11 9.6a2.6 2.6 0 1 0 0 4.8M6.5 11.2h3.6M6.5 12.8h3.6" /><path d="M15.5 6.8A5.5 5.5 0 0 1 15.5 17.2" /></>,
  // Bond certificate
  UST10Y: <><rect x="4" y="3.5" width="16" height="17" rx="1.5" /><path d="M8 8h8M8 11.5h8M8 15h4" /><circle cx="16" cy="16" r="1.6" /></>,
  // City towers
  SCBD: <><path d="M3 20.5h18" /><path d="M5.5 20.5V9l4-2v13.5M9.5 20.5V4l5 2.5v14M14.5 20.5V11h4v9.5" /><path d="M11.5 9h1M11.5 12h1M11.5 15h1" /></>,
  // Coffee bean
  COFFEE: <><ellipse cx="12" cy="12" rx="5.5" ry="8" transform="rotate(35 12 12)" /><path d="M8.2 16.5c2.5-1.2 1.4-4.2 3.8-5.4s1.8-3.5 3.8-4.6" /></>,
  // Copper coil
  COPPER: <><path d="M5 8c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z" /><path d="M5 8v8c0 1.7 3.1 3 7 3s7-1.3 7-3V8" /><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>,
};

export function AssetIcon({ id, className }: P & { id: AssetId }) {
  return <svg {...base(className)}>{ASSET_PATHS[id]}</svg>;
}

const SOURCE_PATHS: Record<EventSource, React.ReactNode> = {
  Geopolitics: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5S9.6 5.9 12 3.5z" /></>,
  Economy: <><path d="M3.5 9.5L12 4l8.5 5.5" /><path d="M5.5 9.5v8M9.5 9.5v8M14.5 9.5v8M18.5 9.5v8M3.5 20h17" /></>,
  Climate: <><path d="M7 15.5a4 4 0 1 1 1.3-7.8A5 5 0 0 1 18 9a3.3 3.3 0 0 1-.5 6.5z" /><path d="M9 18.5l-1 2M13 18.5l-1 2M17 18.5l-1 2" /></>,
  Technology: <><rect x="4" y="7" width="14" height="10" rx="1.5" /><path d="M20 10.5v3M9 9.5l-1.5 3h3L9 15.5" /></>,
  Markets: <><path d="M6 4v16M12 7v13M18 10v10" /><rect x="4.5" y="8" width="3" height="6" /><rect x="10.5" y="10" width="3" height="5" /><rect x="16.5" y="12" width="3" height="4" /></>,
};

export function SourceIcon({ source, className }: P & { source: EventSource }) {
  return <svg {...base(className)}>{SOURCE_PATHS[source]}</svg>;
}

export const ShieldIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3.5l7 2.5v5.5c0 4.4-2.9 7.7-7 9-4.1-1.3-7-4.6-7-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
export const KeyIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l8.5-8.5M16.5 6.5l2 2M14.5 8.5l1.5 1.5" />
  </svg>
);
export const ClockIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const VaultIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3.5" y="4" width="17" height="15" rx="1.5" />
    <circle cx="12" cy="11.5" r="4" />
    <path d="M12 7.5v1.5M12 14v1.5M8 11.5h1.5M14.5 11.5H16M6 19v1.5M18 19v1.5" />
  </svg>
);

export const CryptoIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.5 7.5h4a2 2 0 0 1 0 4h-4zM9.5 11.5h4.5a2 2 0 0 1 0 4H9.5zM9.5 7.5v8M11 6v1.5M13 6v1.5M11 15.5V17M13 15.5V17" />
  </svg>
);

const LIVE_ICON: Record<string, AssetId> = {
  GLD: "GOLD", SLV: "GOLD", USO: "OIL", UNG: "OIL", CPER: "COPPER", DBA: "COFFEE",
  IEF: "UST10Y", VNQ: "SCBD", FXE: "EURUSD",
};

/** Icon for a Live Market asset (crypto coin, stock chart, or the matching commodity/income glyph). */
export function LiveAssetIcon({ id, category, className }: P & { id: string; category: string }) {
  if (category === "crypto") return <CryptoIcon className={className} />;
  return <AssetIcon id={LIVE_ICON[id] ?? "SPX"} className={className} />;
}
