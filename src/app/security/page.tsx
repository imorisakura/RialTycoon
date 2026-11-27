import type { Metadata } from "next";
import { SecurityCenter } from "@/components/game/SecurityCenter";

export const metadata: Metadata = { title: "Security | RialTycoon" };

export default function SecurityPage() {
  return <SecurityCenter />;
}
