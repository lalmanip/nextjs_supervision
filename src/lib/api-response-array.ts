/**
 * Normalizes common API envelope shapes into a flat array of records for tables.
 */
export function extractRecordArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((x) => x && typeof x === "object") as Record<
      string,
      unknown
    >[];
  }
  if (!payload || typeof payload !== "object") return [];

  const o = payload as Record<string, unknown>;

  const tryArray = (v: unknown): Record<string, unknown>[] | null => {
    if (!Array.isArray(v)) return null;
    return v.filter((x) => x && typeof x === "object") as Record<
      string,
      unknown
    >[];
  };

  for (const key of [
    "response",
    "holdTickets",
    "data",
    "content",
    "items",
    "records",
    "rows",
    "list",
    "result",
  ]) {
    const inner = tryArray(o[key]);
    if (inner) return inner;
  }

  const resp = o.response;
  if (Array.isArray(resp)) {
    const inner = tryArray(resp);
    if (inner) return inner;
  }
  if (resp && typeof resp === "object" && !Array.isArray(resp)) {
    const r = resp as Record<string, unknown>;
    for (const key of ["holdTickets", "data", "content", "items"]) {
      const inner = tryArray(r[key]);
      if (inner) return inner;
    }
  }

  return [];
}
