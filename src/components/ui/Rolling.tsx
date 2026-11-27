"use client";

import { useEffect, useRef, useState } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Split-flap style number: each digit rolls to its new value, and the figure
 * tints green or red once when it moves (see DESIGN.md). Columns are keyed from
 * the right so the same decimal place keeps its column between updates.
 */
export function Rolling({
  value,
  format,
  className = "",
  tint = true,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  tint?: boolean;
}) {
  const prev = useRef(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value === prev.current) return;
    const next = value > prev.current ? "up" : "down";
    prev.current = value;
    if (!tint) return;
    setDir(next);
    const t = setTimeout(() => setDir(null), 900);
    return () => clearTimeout(t);
  }, [value, tint]);

  const text = format(value);
  const chars = text.split("");
  const color = dir === "up" ? "text-up" : dir === "down" ? "text-down" : "";

  return (
    <span className={`roll tabular whitespace-nowrap transition-colors duration-[600ms] ${color} ${className}`} aria-label={text}>
      {chars.map((ch, i) => {
        const key = chars.length - i;
        const d = DIGITS.indexOf(ch);
        if (d < 0) {
          return (
            <span key={`s${key}${ch}`} className="roll-char" aria-hidden="true">
              {ch}
            </span>
          );
        }
        return (
          <span key={`d${key}`} className="roll-col" aria-hidden="true">
            <span className="roll-strip" style={{ transform: `translateY(-${d}em)` }}>
              {DIGITS.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export const usd = (p: number) =>
  p.toLocaleString("en-US", {
    minimumFractionDigits: p >= 1 ? 2 : p >= 0.01 ? 4 : 6,
    maximumFractionDigits: p >= 1 ? 2 : p >= 0.01 ? 4 : 6,
  });

export const pct = (c: number) => `${c >= 0 ? "+" : "−"}${Math.abs(c * 100).toFixed(2)}%`;

/** Change figure: sign, arrow and colour together, so direction never relies on colour alone. */
export function Change({ value, className = "" }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span className={`tabular font-medium ${up ? "text-up" : "text-down"} ${className}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span> {pct(value)}
    </span>
  );
}
