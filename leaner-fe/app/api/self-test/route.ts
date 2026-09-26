/**
 * API route proxy for the Lean verifier self-test endpoint.
 *
 * Browser → /api/self-test → Verifier HTTP (Docker internal network)
 *
 * This keeps the verifier isolated from direct browser access.
 */

const VERIFIER_URL = process.env.VERIFIER_URL || "http://verifier:8030";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return Response.json(
        { error: "Missing or invalid 'code' field", messages: [], sorries: [] },
        { status: 400 },
      );
    }

    const resp = await fetch(`${VERIFIER_URL}/self-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, allow_sorry: true }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      return Response.json(
        { error: `Verifier request failed: ${resp.status}`, messages: [], sorries: [] },
        { status: 502 },
      );
    }

    const data = await resp.json();
    return Response.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json(
      {
        error: `Verifier unavailable: ${message}`,
        success: false,
        messages: [{ data: `Verifier unavailable: ${message}`, severity: "error" }],
        sorries: [],
      },
      { status: 503 },
    );
  }
}
