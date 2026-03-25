import { updateBook } from "@/lib/booksApi";

function normalizeIsbnDigits(raw) {
  return (raw || "").toString().trim().replace(/[-\s]/g, "");
}

function looksLikeIsbn(isbn) {
  return /^[0-9]{9}[0-9Xx]$/.test(isbn) || /^[0-9]{13}$/.test(isbn);
}

function hasCover(book) {
  const u = book.coverImageUrl || book.thumbnailURL;
  return typeof u === "string" && u.trim().length > 0;
}

/**
 * For books that have a valid ISBN in Firestore but no coverImageUrl yet,
 * fetch cover via /api/isbn-search and persist. Returns how many docs were updated.
 * Runs sequentially with a small delay to reduce API bursts.
 */
export async function backfillCoversForBooks(userId, books) {
  if (!userId || !Array.isArray(books) || !books.length) return 0;

  const targets = books.filter((b) => {
    const isbn = normalizeIsbnDigits(b.isbn);
    return looksLikeIsbn(isbn) && !hasCover(b);
  });

  if (!targets.length) return 0;

  let updated = 0;
  for (const b of targets) {
    const isbn = normalizeIsbnDigits(b.isbn);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const res = await fetch("/api/isbn-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.coverImageUrl) continue;
      const url = data.coverImageUrl;
      await updateBook(userId, b.id, { coverImageUrl: url, thumbnailURL: url });
      updated += 1;
    } catch {
      // ignore per-book failures
    }
  }
  return updated;
}
