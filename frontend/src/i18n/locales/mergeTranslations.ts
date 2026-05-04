function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Deep-merge locale fragments (plain objects only). Later arguments win on primitive conflicts. */
export function deepMerge(...objects: Record<string, unknown>[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const obj of objects) {
    if (!obj) continue;
    for (const key of Object.keys(obj)) {
      const next = obj[key];
      const prev = out[key];
      if (isPlainObject(next) && isPlainObject(prev)) {
        out[key] = deepMerge(prev, next);
      } else if (isPlainObject(next)) {
        out[key] = deepMerge({}, next);
      } else {
        out[key] = next;
      }
    }
  }
  return out;
}
