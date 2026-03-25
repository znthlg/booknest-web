/** Aligns with iOS default when Firestore omits or uses legacy web label. */

export const DEFAULT_READING_STATUS = "To Read";

export function normalizeReadingStatus(raw) {
  const t = (raw || "").toString().trim();
  if (!t || t === "Not started") return DEFAULT_READING_STATUS;
  return t;
}
