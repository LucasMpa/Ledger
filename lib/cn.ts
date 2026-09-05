/**
 * Tiny `clsx`-style class joiner. Accepts strings, falsy values, arrays, and
 * `{ "class": boolean }` maps; returns a single space-separated className.
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

export function cn(...classes: ClassValue[]): string {
  const out: string[] = [];
  for (const c of classes) {
    if (!c) continue;
    if (typeof c === "string" || typeof c === "number") {
      out.push(String(c));
    } else if (Array.isArray(c)) {
      const joined = cn(...c);
      if (joined) out.push(joined);
    } else {
      for (const [key, value] of Object.entries(c)) {
        if (value) out.push(key);
      }
    }
  }
  return out.join(" ");
}
