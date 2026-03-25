/**
 * Category label for display, aligned with mobile / Firestore shape variance:
 * flat strings, nested maps, or multi-field hierarchies.
 */

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    if (typeof v === "object" && !Array.isArray(v)) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

/** Fallback when categoryMainId is a preset key (e.g. preset-main-fiction) not in Firestore. */
export function presetCategoryMainLabel(id) {
  if (!id || typeof id !== "string") return "";
  const trimmed = id.trim();
  if (!trimmed.startsWith("preset-")) return "";
  const known = {
    "preset-main-fiction": "Fiction",
    "preset-main-nonfiction": "Non-fiction",
    "preset-main-non-fiction": "Non-fiction",
    "preset-main-other": "Other",
    "preset-main-poetry": "Poetry",
    "preset-main-biography": "Biography",
    "preset-main-science": "Science",
    "preset-main-history": "History",
    "preset-main-children": "Children",
    "preset-main-young-adult": "Young adult",
  };
  if (known[trimmed]) return known[trimmed];
  const tail = trimmed.replace(/^preset-(main-|)/, "").replace(/-/g, " ");
  if (!tail) return "";
  return tail
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * @param {object} book
 * @param {Record<string, Record<string, string>>} [lookups] from loadMobileTaxonomyLookups
 */
export function getCategoryDisplay(book, lookups) {
  if (!book || typeof book !== "object") return "";

  if (lookups) {
    const mainId = firstNonEmpty(book.categoryMainId);
    const formId = firstNonEmpty(book.categoryFormId);
    const genreId = firstNonEmpty(book.categoryGenreId);

    const main =
      (mainId && lookups.categoryMains?.[mainId]) || (mainId ? presetCategoryMainLabel(mainId) : "");
    const form = formId && lookups.categoryForms?.[formId] ? lookups.categoryForms[formId] : "";
    const genre = genreId && lookups.categoryGenres?.[genreId] ? lookups.categoryGenres[genreId] : "";

    const parts = [main, form, genre].map((s) => String(s || "").trim()).filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }

  const c = book.category;
  if (typeof c === "string" && c.trim()) return c.trim();

  if (c && typeof c === "object" && !Array.isArray(c)) {
    const single = firstNonEmpty(c.name, c.title, c.label, c.displayName);
    if (single) return single;
    const hierarchy = [
      firstNonEmpty(c.main, c.mainCategory, c.primary, c.level1),
      firstNonEmpty(c.form, c.formCategory, c.secondary, c.level2),
      firstNonEmpty(c.genre, c.genreName, c.tertiary, c.level3),
    ].filter(Boolean);
    if (hierarchy.length) return hierarchy.join(" · ");
  }

  if (Array.isArray(book.categories)) {
    const labels = book.categories
      .map((x) => (typeof x === "string" ? x.trim() : firstNonEmpty(x?.name, x?.title, x?.label)))
      .filter(Boolean);
    if (labels.length) return [...new Set(labels)].join(" · ");
  }

  const path = [
    firstNonEmpty(book.mainCategory, book.primaryCategory, book.categoryMain),
    firstNonEmpty(book.categoryForm, book.formCategory, book.medium),
    firstNonEmpty(book.genre, book.subCategory, book.categoryGenre, book.categorySub, book.secondaryCategory),
  ].filter(Boolean);
  if (path.length) return path.map((s) => s.trim()).filter(Boolean).join(" · ");

  const presetOnly = presetCategoryMainLabel(firstNonEmpty(book.categoryMainId));
  if (presetOnly) return presetOnly;

  return firstNonEmpty(
    book.categoryName,
    book.genreName,
    book.bookCategory,
    book.bookCategoryName,
    book.categoryLabel,
    book.kategori,
    book.Kategori,
    book["category_name"]
  );
}
