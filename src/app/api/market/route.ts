import { connection } from "next/server";
import { getMarket } from "@/lib/market/providers";

/** Live quotes for the Live Market mode. Keys stay on the server. */
export async function GET() {
  await connection();
  const market = await getMarket();
  return Response.json(market, { headers: { "Cache-Control": "no-store" } });
}
