import { normalizeReadingStatus } from "@/lib/readingStatus";

/** @typedef {{ status: string, count: number, percentage: number, color: string, label: string }} ReadingSlice */

/**
 * Buckets for the shelf donut (iOS uses To Read / Reading / Read).
 * Web "Finished" maps to read; other statuses roll into to-read queue.
 */
export function readingProgressBucket(book) {
  const raw = (book?.readingStatus || "").toString().trim();
  const normalized = normalizeReadingStatus(raw);
  if (normalized === "Reading") return "reading";
  if (
    normalized === "Finished" ||
    normalized === "Read" ||
    raw.toLowerCase() === "read"
  ) {
    return "read";
  }
  return "toRead";
}

function pct(n, total) {
  if (!total) return 0;
  return (n / total) * 100;
}

function displayMain(m) {
  return (m?.name || "").toString().trim() || "Untitled";
}

function displayForm(f) {
  return (f?.name || "").toString().trim() || "Untitled";
}

function displayGenre(g) {
  return (g?.name || "").toString().trim() || "Untitled";
}

/**
 * @param {object[]} books
 * @param {{ mainCategories?: object[] } | null | undefined} categorySettings
 */
export function computeShelfDashboard(books, categorySettings) {
  const list = Array.isArray(books) ? books : [];
  const totalBooks = list.length;

  const authorCounts = new Map();
  for (const book of list) {
    const arr = Array.isArray(book.authors)
      ? book.authors
      : book.author
        ? [book.author]
        : [];
    for (const raw of arr) {
      const a = (raw || "").toString().trim();
      if (!a) continue;
      authorCounts.set(a, (authorCounts.get(a) || 0) + 1);
    }
  }

  const topAuthors = Array.from(authorCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((lhs, rhs) =>
      rhs.count !== lhs.count ? rhs.count - lhs.count : lhs.name.localeCompare(rhs.name)
    )
    .slice(0, 10);

  const totalAuthors = authorCounts.size;

  const giftBooks = list.filter((b) => b.isGift).length;
  const signedBooks = list.filter((b) => b.isSigned).length;

  const toReadN = list.filter((b) => readingProgressBucket(b) === "toRead").length;
  const readingN = list.filter((b) => readingProgressBucket(b) === "reading").length;
  const readN = list.filter((b) => readingProgressBucket(b) === "read").length;
  const chartDenom = totalBooks || 1;

  /** @type {(ReadingSlice & { key: string })[]} */
  const readingSlices = [
    {
      key: "toRead",
      status: "To Read",
      label: "To read",
      count: toReadN,
      percentage: pct(toReadN, chartDenom),
      color: "rgb(56, 189, 248)",
    },
    {
      key: "reading",
      status: "Reading",
      label: "Reading",
      count: readingN,
      percentage: pct(readingN, chartDenom),
      color: "rgb(167, 139, 250)",
    },
    {
      key: "read",
      status: "Finished",
      label: "Finished",
      count: readN,
      percentage: pct(readN, chartDenom),
      color: "rgb(52, 211, 153)",
    },
  ];

  const lentOutBooks = list
    .filter((b) => b.isLent)
    .slice()
    .sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" })
    );

  const mains = categorySettings?.mainCategories ?? [];

  /** @type {object[]} */
  const categoryMainStats = [];
  for (const main of mains) {
    const id = main.id;
    const c = list.filter((b) => b.categoryMainId === id).length;
    categoryMainStats.push({
      id: `main-${id}`,
      title: displayMain(main),
      detail: null,
      count: c,
      filter: { type: "main", id },
    });
  }
  const uncMain = list.filter(
    (b) => !b.categoryMainId || String(b.categoryMainId).trim() === ""
  ).length;
  if (uncMain > 0) {
    categoryMainStats.push({
      id: "main-uncategorized",
      title: "Uncategorized",
      detail: "No main category",
      count: uncMain,
      filter: { type: "uncategorized-main" },
    });
  }
  categoryMainStats.sort((a, b) =>
    b.count !== a.count ? b.count - a.count : a.title.localeCompare(b.title)
  );

  /** @type {object[]} */
  const categoryFormStats = [];
  for (const main of mains) {
    const mainLabel = displayMain(main);
    for (const form of main.forms ?? []) {
      const c = list.filter((b) => b.categoryFormId === form.id).length;
      categoryFormStats.push({
        id: `form-${form.id}`,
        title: displayForm(form),
        detail: mainLabel,
        count: c,
        filter: { type: "form", id: form.id },
      });
    }
  }
  const uncForm = list.filter(
    (b) =>
      (!b.categoryFormId || String(b.categoryFormId).trim() === "") &&
      b.categoryMainId &&
      String(b.categoryMainId).trim() !== ""
  ).length;
  if (uncForm > 0) {
    categoryFormStats.push({
      id: "form-uncategorized",
      title: "No form selected",
      detail: "Has main category only",
      count: uncForm,
      filter: { type: "uncategorized-form" },
    });
  }

  /** @type {object[]} */
  const categoryGenreStats = [];
  for (const main of mains) {
    const mainLabel = displayMain(main);
    for (const form of main.forms ?? []) {
      const formLabel = displayForm(form);
      for (const genre of form.genres ?? []) {
        const c = list.filter((b) => b.categoryGenreId === genre.id).length;
        categoryGenreStats.push({
          id: `genre-${genre.id}`,
          title: displayGenre(genre),
          detail: `${mainLabel} · ${formLabel}`,
          count: c,
          filter: { type: "genre", id: genre.id },
        });
      }
    }
  }
  const uncGenre = list.filter((b) => {
    const hasGenre = b.categoryGenreId && String(b.categoryGenreId).trim() !== "";
    const hasFormOrMain =
      (b.categoryFormId && String(b.categoryFormId).trim() !== "") ||
      (b.categoryMainId && String(b.categoryMainId).trim() !== "");
    return !hasGenre && hasFormOrMain;
  }).length;
  if (uncGenre > 0) {
    categoryGenreStats.push({
      id: "genre-uncategorized",
      title: "No genre selected",
      detail: "Main or form set, no genre",
      count: uncGenre,
      filter: { type: "uncategorized-genre" },
    });
  }
  const genreRowsFiltered = categoryGenreStats
    .filter((r) => r.count > 0)
    .sort((a, b) =>
      b.count !== a.count ? b.count - a.count : a.title.localeCompare(b.title)
    );

  return {
    summary: {
      totalBooks,
      totalAuthors,
      giftBooks,
      signedBooks,
    },
    readingSlices,
    readingChartTotal: toReadN + readingN + readN,
    topAuthors,
    categoryMainStats,
    categoryFormStats: categoryFormStats.filter((r) => r.count > 0).sort((a, b) =>
      b.count !== a.count ? b.count - a.count : a.title.localeCompare(b.title)
    ),
    categoryGenreStats: genreRowsFiltered,
    lentOutBooks,
  };
}

/**
 * Build CSS conic-gradient for donut (degrees).
 * @param {ReadingSlice[]} slices
 */
export function readingDonutGradient(slices) {
  const active = slices.filter((s) => s.count > 0);
  const total = active.reduce((acc, s) => acc + s.count, 0);
  if (!total) return null;
  let deg = 0;
  const parts = [];
  for (const s of active) {
    const span = (s.count / total) * 360;
    const start = deg;
    const end = deg + span;
    parts.push(`${s.color} ${start}deg ${end}deg`);
    deg = end;
  }
  return `conic-gradient(${parts.join(", ")})`;
}
