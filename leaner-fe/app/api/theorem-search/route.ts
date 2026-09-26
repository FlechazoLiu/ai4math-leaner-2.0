/**
 * API route proxy for Lean theorem search (LeanSearch - PKU AI4Math).
 *
 * Browser → /api/theorem-search → LeanSearch API (leansearch.net)
 *
 * This avoids CORS issues by proxying through the Next.js server.
 */

const LEANSEARCH_URL =
  process.env.LEANSEARCH_URL || "https://leansearch.net/search";

interface LeanSearchResult {
  name: string[];
  type: string;
  docstring?: string;
  doc_url?: string;
  kind?: string;
}

interface LeanSearchResponse {
  results: LeanSearchResult[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, numResults = 10 } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return Response.json(
        { error: "Missing or invalid 'query' field" },
        { status: 400 },
      );
    }

    const resp = await fetch(LEANSEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: [query.trim()], num_results: numResults }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return Response.json(
        { error: `Search API error: ${resp.status}` },
        { status: 502 },
      );
    }

    // LeanSearch returns an array where [0] is the results array
    const raw: unknown = await resp.json();

    // Normalize response: leansearch.net returns { results: [...] }
    // but some versions return [[{ result: {...} }]]
    let results: LeanSearchResult[] = [];

    if (Array.isArray(raw)) {
      // Format: [[{ result: { name, type, ... } }, ...]]
      const outer = raw as unknown[][];
      if (outer.length > 0 && Array.isArray(outer[0])) {
        results = outer[0]
          .map((item: unknown) => {
            if (typeof item === "object" && item !== null && "result" in item) {
              return (item as { result: LeanSearchResult }).result;
            }
            return null;
          })
          .filter((r): r is LeanSearchResult => r !== null);
      }
    } else if (typeof raw === "object" && raw !== null && "results" in raw) {
      // Format: { results: [{ name, type, ... }] }
      results = (raw as LeanSearchResponse).results;
    }

    return Response.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json(
      { error: `Search unavailable: ${message}`, results: [] },
      { status: 503 },
    );
  }
}
