import type { Metadata } from "next";
import { SecurityCenter } from "@/components/game/SecurityCenter";

export const metadata: Metadata = { title: "RialTycoon — Security Center" };

export default function SecurityPage() {
  return <SecurityCenter />;
}
