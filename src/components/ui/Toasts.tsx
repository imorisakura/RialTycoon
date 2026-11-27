"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "ok" | "error" | "info";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastContext);

let next = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Tone = "ok") => {
    const id = next++;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed top-28 left-1/2 z-[120] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 md:top-auto md:bottom-6 md:left-auto md:right-6 md:translate-x-0" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`rounded-panel border px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.45)] ${
                t.tone === "ok"
                  ? "border-up/40 bg-[#0e1a12] text-ink"
                  : t.tone === "error"
                    ? "border-down/40 bg-[#1d0f10] text-ink"
                    : "border-gold/40 bg-panel text-ink"
              }`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
