import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies the Privy access token server-side.
 * Privy itself verifies the Google id_token during OAuth; this route checks
 * that the session token Privy issued is genuine (signature, issuer, audience)
 * using Privy's public JWKS for this app, so no app secret is required.
 */
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const jwks = APP_ID ? createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`)) : null;

export async function POST(req: Request) {
  if (!jwks) return Response.json({ ok: false, error: "No Privy app ID configured" }, { status: 400 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ ok: false, error: "Missing token" }, { status: 401 });
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: "privy.io", audience: APP_ID });
    return Response.json({ ok: true, userId: payload.sub });
  } catch {
    return Response.json({ ok: false, error: "Invalid or expired session token" }, { status: 401 });
  }
}
