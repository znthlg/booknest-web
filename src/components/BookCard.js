"use client";

import BookCardDetails, { BookAttributeIcons } from "@/components/BookCardDetails";
import { getCategoryDisplay } from "@/lib/bookCategory";
import { getPlacementDisplay } from "@/lib/bookPlacement";
import { normalizeReadingStatus } from "@/lib/readingStatus";

function statusAccent(readingStatus) {
  const s = (readingStatus || "").toLowerCase().trim();
  if (s.includes("to read")) return "bg-sky-500/15 text-sky-200 border-sky-500/25";
  if (s.includes("not started")) return "bg-indigo-500/15 text-indigo-200 border-indigo-500/20";
  if (s === "reading" || s.startsWith("reading")) return "bg-violet-500/15 text-violet-200 border-violet-500/25";
  if (s.includes("finished") || s === "read") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
  if (s.includes("hold")) return "bg-amber-500/15 text-amber-200 border-amber-500/20";
  if (s.includes("abandon")) return "bg-rose-500/15 text-rose-200 border-rose-500/20";
  return "bg-white/10 text-foreground/80 border-white/15";
}

function formatCreatedAt(createdAt) {
  if (!createdAt) return "";
  if (typeof createdAt.toDate === "function") {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(
      createdAt.toDate()
    );
  }
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

export default function BookCard({
  book,
  onEdit,
  layout = "grid",
  taxonomyLookups = null,
  bulkMode = false,
  bulkSelected = false,
  onBulkToggle,
}) {
  const cover = book.coverImageUrl || book.thumbnailURL ? book.coverImageUrl || book.thumbnailURL : "";
  const authors = Array.isArray(book.authors)
    ? book.authors.filter(Boolean)
    : book.author
      ? [book.author]
      : [];
  const authorText = authors.length ? authors.join(", ") : "";
  const placementLabel = getPlacementDisplay(book, taxonomyLookups);
  const categoryLabel = getCategoryDisplay(book, taxonomyLookups);

  const isList = layout === "list";
  const added = formatCreatedAt(book.createdAt);

  const listRowProps = bulkMode
    ? onBulkToggle
      ? {
          role: "button",
          tabIndex: 0,
          "aria-pressed": bulkSelected,
          "aria-label": `Select ${book.title || "book"}`,
          onClick: () => onBulkToggle(book.id),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onBulkToggle(book.id);
            }
          },
        }
      : {}
    : onEdit
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": `Edit ${book.title || "book"}`,
          onClick: () => onEdit(book),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onEdit(book);
            }
          },
        }
      : {};

  if (isList) {
    const listClickable = bulkMode ? !!onBulkToggle : !!onEdit;
    return (
      <div
        className={`group flex items-center gap-3 rounded-2xl border bg-white/5 px-3 py-2 shadow-sm backdrop-blur transition hover:border-white/15 hover:bg-white/[0.07] ${
          bulkMode
            ? `${listClickable ? "cursor-pointer " : ""}${bulkSelected ? "border-indigo-400/40 ring-1 ring-indigo-400/25" : "border-white/10"}`
            : listClickable
              ? "cursor-pointer border-white/10"
              : "border-white/10"
        }`}
        {...listRowProps}
      >
        {bulkMode ? (
          <div
            className="flex h-[4.5rem] w-9 shrink-0 items-center justify-center"
            aria-hidden
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] font-bold leading-none ${
                bulkSelected
                  ? "border-indigo-400 bg-indigo-500/35 text-indigo-50"
                  : "border-white/35 bg-white/5"
              }`}
            >
              {bulkSelected ? "✓" : ""}
            </span>
          </div>
        ) : null}
        {cover ? (
          <div className="shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              className="h-[4.5rem] w-[3.25rem] object-cover"
            />
          </div>
        ) : (
          <div className="flex h-[4.5rem] w-[3.25rem] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-indigo-400/20 to-fuchsia-400/10">
            <span className="text-lg font-semibold text-foreground/65">
              {(book.title || "B").trim().slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="min-w-0 max-w-full shrink truncate text-sm font-semibold leading-tight text-foreground sm:max-w-[min(100%,36rem)]">
                  {book.title || "Untitled"}
                </h2>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <span
                    className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusAccent(
                      normalizeReadingStatus(book.readingStatus)
                    )}`}
                  >
                    {normalizeReadingStatus(book.readingStatus)}
                  </span>
                  <BookAttributeIcons book={book} compact />
                </div>
              </div>
              {authorText ? (
                <p className="mt-0.5 truncate text-[12px] text-foreground/50">{authorText}</p>
              ) : null}
              <BookCardDetails
                compact
                book={book}
                categoryLabel={categoryLabel}
                placementLabel={placementLabel}
              />
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
              {added ? (
                <span className="hidden text-[10px] tabular-nums text-foreground/40 sm:inline">{added}</span>
              ) : null}
            </div>
          </div>
          {added ? (
            <p className="mt-1 text-[10px] tabular-nums text-foreground/35 sm:hidden">{added}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const gridCardProps = bulkMode
    ? onBulkToggle
      ? {
          role: "button",
          tabIndex: 0,
          "aria-pressed": bulkSelected,
          "aria-label": `Select ${book.title || "book"}`,
          onClick: () => onBulkToggle(book.id),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onBulkToggle(book.id);
            }
          },
        }
      : {}
    : onEdit
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": `Edit ${book.title || "book"}`,
          onClick: () => onEdit(book),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onEdit(book);
            }
          },
        }
      : {};

  const gridClickable = bulkMode ? !!onBulkToggle : !!onEdit;

  return (
    <div
      className={`group relative rounded-2xl border bg-white/5 p-3 shadow-sm backdrop-blur transition hover:border-white/15 hover:bg-white/8 sm:rounded-3xl sm:p-5 ${
        bulkMode
          ? `${gridClickable ? "cursor-pointer " : ""}${bulkSelected ? "border-indigo-400/40 ring-1 ring-indigo-400/25" : "border-white/10"}`
          : gridClickable
            ? "cursor-pointer border-white/10"
            : "border-white/10"
      }`}
      {...gridCardProps}
    >
      {bulkMode ? (
        <div
          className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md sm:right-3 sm:top-3 sm:h-8 sm:w-8 sm:text-sm ${
            bulkSelected
              ? "border-indigo-400 bg-indigo-500/50 text-white"
              : "border-white/40 bg-black/35 text-transparent"
          }`}
          aria-hidden
        >
          {bulkSelected ? "✓" : ""}
        </div>
      ) : null}
      {cover ? (
        <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:mb-4 sm:rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={`${book.title || "Book"} cover`}
            className="w-full object-contain"
            style={{ aspectRatio: "2 / 3" }}
          />
        </div>
      ) : (
        <div
          className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-indigo-400/20 to-fuchsia-400/10 sm:mb-4 sm:rounded-2xl"
          style={{ aspectRatio: "2 / 3" }}
        >
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-2xl font-semibold text-foreground/70 sm:text-4xl">
              {(book.title || "B").trim().slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-snug text-foreground sm:text-base sm:leading-6">
              <span className="line-clamp-2">{book.title || "Untitled"}</span>
            </div>
            {authorText ? (
              <div className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-foreground/55 sm:mt-2 sm:text-[13px]">
                {authorText}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <div
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium sm:px-2.5 sm:py-1 sm:text-[11px] ${statusAccent(
                  normalizeReadingStatus(book.readingStatus)
                )}`}
              >
                {normalizeReadingStatus(book.readingStatus)}
              </div>
              <BookAttributeIcons book={book} />
            </div>
          </div>
        </div>

        <BookCardDetails book={book} categoryLabel={categoryLabel} placementLabel={placementLabel} />

        {added ? (
          <div className="mt-4 text-xs text-foreground/55">{`Added ${added}`}</div>
        ) : null}
      </div>
    </div>
  );
}
