/**
 * Public trial age copy. Compact maxAge is Uint8; 255 means no published max.
 * Uses a hyphen, never an en-dash or em-dash.
 */
export function formatAgeRange(minAge: number, maxAge: number): string {
  if (!Number.isFinite(minAge)) return "See study age range";
  if (!Number.isFinite(maxAge) || maxAge >= 255) return `Ages ${minAge}+`;
  return `Ages ${minAge}-${maxAge}`;
}
