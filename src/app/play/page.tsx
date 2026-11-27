import type { Metadata } from "next";
import { GameApp } from "@/components/game/GameApp";

export const metadata: Metadata = { title: "Terminal | RialTycoon" };

export default function PlayPage() {
  return <GameApp />;
}
