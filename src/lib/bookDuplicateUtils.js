/**
 * Duplicate detection when adding books (ISBN including 10↔13, or title + authors).
 */

export function normalizeIsbnDigits(isbn) {
  return (isbn || "").toString().trim().replace(/[-\s]/g, "").toUpperCase();
}

/** Map ISBN-10 / ISBN-13 to a common ISBN-13 form for comparison when possible. */
export function toComparableIsbn13(isbn) {
  const d = normalizeIsbnDigits(isbn);
  if (!d) return "";
  if (d.length === 13 && /^97[89]/.test(d)) return d;
  if (d.length === 10 && /^[0-9]{9}[0-9X]$/.test(d)) {
    const nine = d.slice(0, 9);
    const core = `978${nine}`;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(core[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return `${core}${check}`;
  }
  return d;
}

export function isbnLikelySame(a, b) {
  const A = toComparableIsbn13(a);
  const B = toComparableIsbn13(b);
  if (!normalizeIsbnDigits(a) || !normalizeIsbnDigits(b)) return false;
  if (A.length === 13 && B.length === 13) return A === B;
  return normalizeIsbnDigits(a) === normalizeIsbnDigits(b);
}

function normalizeTitle(title) {
  return (title || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function authorsSortedKey(authors) {
  if (!Array.isArray(authors) || !authors.length) return "";
  return [...authors]
    .map((a) => String(a || "").toLowerCase().trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

/**
 * @param {object[]} books
 * @param {{ isbn?: string, title?: string, authors?: string[] }} candidate
 */
export function findDuplicateBooks(books, { isbn, title, authors }) {
  const list = books || [];
  const nTitle = normalizeTitle(title);
  const aKey = authorsSortedKey(authors);
  const matches = [];
  const seen = new Set();

  for (const b of list) {
    const id = b.id || JSON.stringify(b);
    if (seen.has(id)) continue;

    if (isbnLikelySame(isbn, b.isbn)) {
      seen.add(id);
      matches.push(b);
      continue;
    }

    if (nTitle.length >= 2 && aKey.length > 0) {
      const bAuthors = Array.isArray(b.authors) ? b.authors : b.author ? [b.author] : [];
      if (normalizeTitle(b.title) === nTitle && authorsSortedKey(bAuthors) === aKey) {
        seen.add(id);
        matches.push(b);
      }
    }
  }
  return matches;
}

/** @param {object} book */
export function publicationYearFromBook(book) {
  if (!book || typeof book !== "object") return null;
  const direct =
    book.publicationYear ??
    book.publishYear ??
    book.yearPublished ??
    book.publishedYear ??
    book.publication_year;
  if (direct != null && String(direct).trim()) {
    const m = String(direct).match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
    if (m) return parseInt(m[0], 10);
  }
  for (const key of ["publishedDate", "publicationDate", "publishDate"]) {
    const d = book[key];
    if (typeof d === "string" && d) {
      const m = d.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
      if (m) return parseInt(m[0], 10);
    }
  }
  return null;
}

export function parseYearFromInput(raw) {
  const s = (raw || "").toString().trim();
  if (!s) return null;
  const m = s.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
  if (m) return parseInt(m[0], 10);
  return null;
}
