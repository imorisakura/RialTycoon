import { connection } from "next/server";
import { getNews } from "@/lib/market/providers";

/** Market news headlines (Finnhub) for the Live Market feed. */
export async function GET() {
  await connection();
  return Response.json(await getNews(), { headers: { "Cache-Control": "no-store" } });
}
