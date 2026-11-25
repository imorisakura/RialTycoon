import type { Metadata } from "next";
import { GameApp } from "@/components/game/GameApp";

export const metadata: Metadata = { title: "RialTycoon — Market terminal" };

export default function PlayPage() {
  return <GameApp />;
}
