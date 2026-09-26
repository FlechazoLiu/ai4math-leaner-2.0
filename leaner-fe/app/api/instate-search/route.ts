/**
 * API route proxy for In-State search (premise-search.com).
 *
 * Browser → POST /api/instate-search → GET premise-search.com/api/search
 *
 * Takes a Lean proof state goal and returns relevant mathlib theorems.
 * Uses RUC AI4Math's Lean State Search (陶亦成团队).
 */

const STATE_SEARCH_API =
  process.env.STATE_SEARCH_URL || "https://premise-search.com/api/search";

const STATE_SEARCH_REV =
  process.env.STATE_SEARCH_REV || "v4.22.0";

interface PremiseResult {
  name: string;
  formal_type?: string;
  module?: string;
  score?: number;
  rev?: string;
}

export async function POST(request: Request) {
  try {
    const body: { goal?: string } = await request.json();
    const { goal } = body;

    if (!goal || typeof goal !== "string" || !goal.trim()) {
      return Response.json(
        { error: "Missing or invalid 'goal' field", results: [] },
        { status: 400 },
      );
    }

    const url = new URL(STATE_SEARCH_API);
    url.searchParams.set("query", goal.trim());
    url.searchParams.set("results", "8");
    url.searchParams.set("rev", STATE_SEARCH_REV);

    const resp = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return Response.json(
        { error: `In-State search API error: ${resp.status}`, results: [] },
        { status: 502 },
      );
    }

    const raw: unknown = await resp.json();

    // Response is an array of { name, formal_type, module, rev }
    let results: PremiseResult[] = [];
    if (Array.isArray(raw)) {
      results = raw as PremiseResult[];
    } else if (typeof raw === "object" && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.results)) {
        results = obj.results as PremiseResult[];
      }
    }

    return Response.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json(
      { error: `In-State search unavailable: ${message}`, results: [] },
      { status: 503 },
    );
  }
}
