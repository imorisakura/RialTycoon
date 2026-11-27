"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  labelledBy = "modal-title",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className="w-full max-w-md rounded-panel border border-line bg-panel p-6 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            initial={{ y: 16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 16, scale: 0.98 }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id={labelledBy} className="text-lg font-semibold text-ink">
                {title}
              </h2>
              <button onClick={onClose} className="tx -mr-2 -mt-1 grid h-9 w-9 place-items-center rounded-control text-muted hover:bg-panel-2 hover:text-ink" aria-label="Close">
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "warn" | "up" | "down" | "muted" }) {
  const tones = {
    gold: "border-gold/40 text-gold",
    warn: "border-line bg-panel-2 text-ink",
    up: "border-up/40 bg-up/10 text-up",
    down: "border-down/40 bg-down/10 text-down",
    muted: "border-line bg-panel-2 text-muted",
  };
  return (
    <span className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-control border px-2 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
