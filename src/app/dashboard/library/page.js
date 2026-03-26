"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import BookList from "@/components/BookList";
import BulkBookModals from "@/components/BulkBookModals";
import BulkBooksToolbar from "@/components/BulkBooksToolbar";
import LibraryActiveFilterChips from "@/components/library/LibraryActiveFilterChips";
import {
  applySearchParamsToLibraryState,
  buildBooksLibraryQuery,
} from "@/lib/libraryQueryString";
import { deleteBook, updateBook } from "@/lib/booksApi";
import { backfillCoversForBooks } from "@/lib/backfillBookCovers";
import BookFormModal from "@/components/books/BookFormModal";
import { ensureCategoryCatalogSeeded } from "@/lib/categoryCatalog/seedCategoryCatalog";
import { ensurePlacementCatalogSeeded } from "@/lib/placementCatalog/seedPlacementCatalog";
import { getCategorySettings } from "@/lib/categoryCatalogApi";
import { getPlacementSettings } from "@/lib/placementSettingsApi";
import { getCategoryDisplay } from "@/lib/bookCategory";
import { loadMobileTaxonomyLookups } from "@/lib/mobileBookLookups";
import { getPlacementDisplay } from "@/lib/bookPlacement";
import { normalizeReadingStatus } from "@/lib/readingStatus";
import { labelPlacementRoom } from "@/lib/taxonomyTreeMaps";

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => v.toString());
  return value
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeText(s) {
  return (s || "").toString().toLowerCase();
}

function getCreatedAtMillis(createdAt) {
  if (!createdAt) return 0;
  if (typeof createdAt.toMillis === "function") return createdAt.toMillis();
  if (typeof createdAt.seconds === "number") return createdAt.seconds * 1000;
  if (typeof createdAt.toDate === "function") return createdAt.toDate().getTime();
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function mapBookSearchResultToPrefill(item) {
  return {
    title: item?.title || "",
    authors: Array.isArray(item?.authors) ? item.authors : [],
    language: item?.language || "",
    publisher: item?.publisher || "",
    publicationYear: item?.publicationYear || "",
    isbn: item?.isbn || "",
    coverImageUrl: item?.coverImageUrl || "",
    thumbnailURL: item?.coverImageUrl || "",
  };
}

function LibraryPageContent() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [books, setBooks] = useState([]);
  const [categorySettings, setCategorySettings] = useState(
    /** @type {{ mainCategories: object[] } | null} */ (null)
  );
  const [placementSettings, setPlacementSettings] = useState(
    /** @type {{ rooms: object[] } | null} */ (null)
  );

  const [booksLoading, setBooksLoading] = useState(false);
  const [mobileLookups, setMobileLookups] = useState(
    /** @type {Record<string, Record<string, string>>} */ ({})
  );
  const [error, setError] = useState("");

  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");
  const [onlineResults, setOnlineResults] = useState([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [categoryMainFilter, setCategoryMainFilter] = useState("all");
  const [categoryFormFilter, setCategoryFormFilter] = useState("all");
  const [categoryGenreFilter, setCategoryGenreFilter] = useState("all");
  const [placementRoomFilter, setPlacementRoomFilter] = useState("all");
  const [readingStatus, setReadingStatus] = useState("all");
  const [filterGift, setFilterGift] = useState(false);
  const [filterSigned, setFilterSigned] = useState(false);
  const [filterLent, setFilterLent] = useState(false);

  const readingStatuses = useMemo(
    () => ["all", "To Read", "Reading", "Finished", "On hold", "Abandoned"],
    []
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(/** @type {string[]} */ ([]));
  const [bulkDialog, setBulkDialog] = useState(
    /** @type {null | "status" | "category" | "placement" | "delete"} */ (null)
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (!searchParams) return;
    const next = applySearchParamsToLibraryState(searchParams);
    setCategoryMainFilter(next.categoryMainFilter);
    setCategoryFormFilter(next.categoryFormFilter);
    setCategoryGenreFilter(next.categoryGenreFilter);
    setPlacementRoomFilter(next.placementRoomFilter);
    setReadingStatus(next.readingStatus);
    setFilterGift(next.filterGift);
    setFilterSigned(next.filterSigned);
    setFilterLent(next.filterLent);
  }, [searchParams]);

  const replaceLibraryUrl = useCallback(
    (patch) => {
      const q = buildBooksLibraryQuery({
        categoryMainFilter: patch.categoryMainFilter ?? categoryMainFilter,
        categoryFormFilter: patch.categoryFormFilter ?? categoryFormFilter,
        categoryGenreFilter: patch.categoryGenreFilter ?? categoryGenreFilter,
        placementRoomFilter: patch.placementRoomFilter ?? placementRoomFilter,
        readingStatus: patch.readingStatus ?? readingStatus,
        filterGift: patch.filterGift ?? filterGift,
        filterSigned: patch.filterSigned ?? filterSigned,
        filterLent: patch.filterLent ?? filterLent,
      });
      router.replace(`${pathname}${q}`, { scroll: false });
    },
    [
      categoryFormFilter,
      categoryGenreFilter,
      categoryMainFilter,
      filterGift,
      filterLent,
      filterSigned,
      pathname,
      placementRoomFilter,
      readingStatus,
      router,
    ]
  );

  const load = async (skipBackfill = false) => {
    if (!user) return;

    setError("");
    setBooksLoading(true);

    try {
      await ensureCategoryCatalogSeeded(user.uid);
      await ensurePlacementCatalogSeeded(user.uid);
      const [booksSnap, taxonomy, catTree, placement] = await Promise.all([
        getDocs(collection(db, "users", user.uid, "books")),
        loadMobileTaxonomyLookups(user.uid),
        getCategorySettings(user.uid),
        getPlacementSettings(user.uid),
      ]);

      const list = booksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => getCreatedAtMillis(b.createdAt) - getCreatedAtMillis(a.createdAt));
      setBooks(list);

      setCategorySettings(catTree);
      setPlacementSettings(placement);
      setMobileLookups(taxonomy);

      if (!skipBackfill) {
        const n = await backfillCoversForBooks(user.uid, list);
        if (n > 0) await load(true);
      }
    } catch (err) {
      setError(err?.message || "Failed to load your library.");
    } finally {
      setBooksLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.uid]);

  const filtered = useMemo(() => {
    const q = normalizeText(search);

    return books.filter((b) => {
      const matchesSearch =
        !q ||
        normalizeText(b.title).includes(q) ||
        normalizeText((b.notes || "")).includes(q) ||
        normalizeText(normalizeList(b.authors).join(", ")).includes(q) ||
        normalizeText(b.author).includes(q) ||
        normalizeText(b.isbn || "").includes(q) ||
        normalizeText(getPlacementDisplay(b, mobileLookups)).includes(q) ||
        normalizeText(getCategoryDisplay(b, mobileLookups)).includes(q);

      const categoryLine = getCategoryDisplay(b, mobileLookups);
      const filterMain = categorySettings?.mainCategories?.find(
        (m) => m.id === categoryMainFilter
      );
      const filterMainName = filterMain?.name;

      let matchesCategoryMain =
        categoryMainFilter === "all"
          ? true
          : categoryMainFilter === "uncategorized"
            ? !b.categoryMainId || String(b.categoryMainId).trim() === ""
            : b.categoryMainId === categoryMainFilter ||
              (!!filterMainName &&
                !!categoryLine &&
                (categoryLine === filterMainName || categoryLine.startsWith(`${filterMainName} ·`)));

      const matchesForm =
        categoryFormFilter === "all"
          ? true
          : categoryFormFilter === "uncategorized"
            ? !!b.categoryMainId &&
              String(b.categoryMainId).trim() !== "" &&
              (!b.categoryFormId || String(b.categoryFormId).trim() === "")
            : b.categoryFormId === categoryFormFilter;

      const matchesGenre =
        categoryGenreFilter === "all"
          ? true
          : categoryGenreFilter === "uncategorized"
            ? (!!b.categoryFormId || !!b.categoryMainId) &&
              (!b.categoryGenreId || String(b.categoryGenreId).trim() === "")
            : b.categoryGenreId === categoryGenreFilter;

      const matchesPlacementRoom =
        placementRoomFilter === "all"
          ? true
          : b.physicalRoomId === placementRoomFilter;

      const matchesStatus =
        readingStatus === "all"
          ? true
          : normalizeReadingStatus(b.readingStatus) === readingStatus;

      const matchesGift = !filterGift || !!b.isGift;
      const matchesSigned = !filterSigned || !!b.isSigned;
      const matchesLent = !filterLent || !!b.isLent;

      return (
        matchesSearch &&
        matchesCategoryMain &&
        matchesForm &&
        matchesGenre &&
        matchesPlacementRoom &&
        matchesStatus &&
        matchesGift &&
        matchesSigned &&
        matchesLent
      );
    });
  }, [
    books,
    categoryFormFilter,
    categoryGenreFilter,
    categoryMainFilter,
    categorySettings,
    filterGift,
    filterLent,
    filterSigned,
    mobileLookups,
    placementRoomFilter,
    readingStatus,
    search,
  ]);

  const localTitleAuthorMatches = useMemo(() => {
    const q = normalizeText(search).trim();
    if (!q) return [];
    return books.filter((b) => {
      return (
        normalizeText(b.title).includes(q) ||
        normalizeText(normalizeList(b.authors).join(", ")).includes(q) ||
        normalizeText(b.author).includes(q)
      );
    });
  }, [books, search]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setOnlineResults([]);
      setOnlineError("");
      setOnlineLoading(false);
      return;
    }
    if (localTitleAuthorMatches.length > 0) {
      setOnlineResults([]);
      setOnlineError("");
      setOnlineLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setOnlineLoading(true);
      setOnlineError("");
      try {
        const r = await fetch(`/api/book-search?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data?.error || "Online search failed.");
        }
        setOnlineResults(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        setOnlineResults([]);
        setOnlineError(err?.message || "Online search failed.");
      } finally {
        setOnlineLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [localTitleAuthorMatches.length, search]);

  const filteredIdSet = useMemo(() => new Set(filtered.map((b) => b.id)), [filtered]);

  useEffect(() => {
    if (!bulkMode) return;
    setSelectedIds((prev) => prev.filter((id) => filteredIdSet.has(id)));
  }, [bulkMode, filteredIdSet]);

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds([]);
    setBulkDialog(null);
  };

  const toggleBulkSelection = (bookId) => {
    setSelectedIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const buildInitialBook = (book) => {
    const authors = Array.isArray(book.authors)
      ? book.authors.filter(Boolean)
      : book.author
        ? [book.author]
        : [];

    const categoryString =
      typeof book.category === "string" ? book.category.trim() : "";
    const categoryLine = getCategoryDisplay(book, mobileLookups);
    const category = categoryString || categoryLine || "";

    const resolvedCategoryId = book.categoryId || book.categoryFormId || "";

    return {
      ...book,
      authors,
      categoryMainId: book.categoryMainId || "",
      categoryFormId: book.categoryFormId || "",
      categoryGenreId: book.categoryGenreId || "",
      categoryId: resolvedCategoryId,
      category,
      physicalRoomId: book.physicalRoomId || "",
      physicalBookshelfId: book.physicalBookshelfId || "",
      physicalShelfId: book.physicalShelfId || "",
      readingStatus: normalizeReadingStatus(book.readingStatus),
      notes: book.notes ?? "",
      language: book.language || book.publicationLanguage || "",
      coverImageUrl: book.coverImageUrl || "",
      thumbnailURL: book.thumbnailURL || "",
      isbn: book.isbn || "",
    };
  };

  const onEdit = (book) => {
    setError("");
    setEditBook(buildInitialBook(book));
    setEditOpen(true);
  };

  const placementRooms = placementSettings?.rooms ?? [];

  const clearAllLibraryFilters = useCallback(() => {
    setSearch("");
    setCategoryMainFilter("all");
    setCategoryFormFilter("all");
    setCategoryGenreFilter("all");
    setPlacementRoomFilter("all");
    setReadingStatus("all");
    setFilterGift(false);
    setFilterSigned(false);
    setFilterLent(false);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const filterChips = useMemo(() => {
    const chips = [];
    const q = search.trim();
    if (q) {
      const short = q.length > 36 ? `${q.slice(0, 36)}…` : q;
      chips.push({
        key: "search",
        label: `Search: “${short}”`,
        onRemove: () => setSearch(""),
      });
    }

    if (categoryMainFilter !== "all") {
      const label =
        categoryMainFilter === "uncategorized"
          ? "Category: uncategorized (main)"
          : `Category: ${categorySettings?.mainCategories?.find((m) => m.id === categoryMainFilter)?.name || categoryMainFilter}`;
      chips.push({
        key: "main",
        label,
        onRemove: () => {
          setCategoryMainFilter("all");
          setCategoryFormFilter("all");
          setCategoryGenreFilter("all");
          replaceLibraryUrl({
            categoryMainFilter: "all",
            categoryFormFilter: "all",
            categoryGenreFilter: "all",
          });
        },
      });
    }

    if (categoryFormFilter !== "all") {
      let formTitle = categoryFormFilter;
      if (categoryFormFilter === "uncategorized") {
        formTitle = "Uncategorized (form)";
      } else {
        for (const m of categorySettings?.mainCategories ?? []) {
          const f = m.forms?.find((x) => x.id === categoryFormFilter);
          if (f?.name) {
            formTitle = f.name;
            break;
          }
        }
      }
      chips.push({
        key: "form",
        label: `Form: ${formTitle}`,
        onRemove: () => {
          setCategoryFormFilter("all");
          setCategoryGenreFilter("all");
          replaceLibraryUrl({ categoryFormFilter: "all", categoryGenreFilter: "all" });
        },
      });
    }

    if (categoryGenreFilter !== "all") {
      let genreTitle = categoryGenreFilter;
      if (categoryGenreFilter === "uncategorized") {
        genreTitle = "Uncategorized (genre)";
      } else {
        outer: for (const m of categorySettings?.mainCategories ?? []) {
          for (const f of m.forms ?? []) {
            const g = f.genres?.find((x) => x.id === categoryGenreFilter);
            if (g?.name) {
              genreTitle = g.name;
              break outer;
            }
          }
        }
      }
      chips.push({
        key: "genre",
        label: `Genre: ${genreTitle}`,
        onRemove: () => {
          setCategoryGenreFilter("all");
          replaceLibraryUrl({ categoryGenreFilter: "all" });
        },
      });
    }

    if (placementRoomFilter !== "all") {
      const room = placementSettings?.rooms?.find((r) => r.id === placementRoomFilter);
      chips.push({
        key: "room",
        label: `Room: ${room ? labelPlacementRoom(room) : placementRoomFilter}`,
        onRemove: () => {
          setPlacementRoomFilter("all");
          replaceLibraryUrl({ placementRoomFilter: "all" });
        },
      });
    }

    if (readingStatus !== "all") {
      chips.push({
        key: "status",
        label: `Status: ${readingStatus}`,
        onRemove: () => {
          setReadingStatus("all");
          replaceLibraryUrl({ readingStatus: "all" });
        },
      });
    }

    if (filterGift) {
      chips.push({
        key: "gift",
        label: "Gifts only",
        onRemove: () => {
          setFilterGift(false);
          replaceLibraryUrl({ filterGift: false });
        },
      });
    }
    if (filterSigned) {
      chips.push({
        key: "signed",
        label: "Signed only",
        onRemove: () => {
          setFilterSigned(false);
          replaceLibraryUrl({ filterSigned: false });
        },
      });
    }
    if (filterLent) {
      chips.push({
        key: "lent",
        label: "Lent only",
        onRemove: () => {
          setFilterLent(false);
          replaceLibraryUrl({ filterLent: false });
        },
      });
    }

    return chips;
  }, [
    categoryFormFilter,
    categoryGenreFilter,
    categoryMainFilter,
    categorySettings,
    filterGift,
    filterLent,
    filterSigned,
    placementRoomFilter,
    placementSettings,
    readingStatus,
    replaceLibraryUrl,
    search,
  ]);

  const hasActiveFilterChips = filterChips.length > 0;

  if (loading || booksLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <div className="text-sm text-foreground/70">Loading your library…</div>
      </div>
    );
  }

  return (
    <div className={bulkMode && selectedIds.length > 0 ? "pb-28 sm:pb-32" : undefined}>
      {error ? (
        <div className="mb-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => {
            if (bulkMode) exitBulkMode();
            else setBulkMode(true);
          }}
          className={`rounded-2xl border px-4 py-2 text-xs font-semibold tracking-wide transition ${
            bulkMode
              ? "border-amber-400/35 bg-amber-500/15 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]"
              : "border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:border-indigo-400/40 hover:bg-indigo-500/15"
          }`}
        >
          {bulkMode ? "Exit bulk select" : "Bulk select"}
        </button>
      </div>

      <LibraryActiveFilterChips
        chips={filterChips}
        hasActiveFilters={hasActiveFilterChips}
        onClearAll={clearAllLibraryFilters}
      />

      <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 lg:w-1/2">
          <div className="text-sm font-medium text-foreground/85">Books</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full">
              <input
                type="text"
                value={search}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 150)}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSearchDropdown(true);
                }}
                placeholder="Search title or author…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
              />
              {showSearchDropdown &&
              search.trim().length >= 2 &&
              localTitleAuthorMatches.length === 0 ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-auto rounded-2xl border border-white/12 bg-[var(--background)]/95 p-2 shadow-xl backdrop-blur-md">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                    Online results
                  </div>
                  {onlineLoading ? (
                    <div className="px-2 py-2 text-xs text-foreground/60">Searching online…</div>
                  ) : onlineError ? (
                    <div className="px-2 py-2 text-xs text-rose-200">{onlineError}</div>
                  ) : onlineResults.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-foreground/60">
                      No online matches found.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {onlineResults.map((item, idx) => (
                        <button
                          key={`${item.sourceKey || item.title}-${idx}`}
                          type="button"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            const prefill = mapBookSearchResultToPrefill(item);
                            router.push(
                              `/dashboard/books/new?prefill=${encodeURIComponent(
                                JSON.stringify(prefill)
                              )}`
                            );
                          }}
                        >
                          <div className="text-sm font-medium text-foreground/90">
                            {item.title || "Untitled"}
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-xs text-foreground/65">
                            {(Array.isArray(item.authors) ? item.authors.join(", ") : "") ||
                              "Author unknown"}
                          </div>
                          <div className="mt-1 text-[11px] text-foreground/50">
                            {[item.publicationYear, item.source].filter(Boolean).join(" · ")}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  viewMode === "grid"
                    ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                    : "border-white/10 bg-white/5 text-foreground/80 hover:bg-white/10"
                }`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  viewMode === "list"
                    ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                    : "border-white/10 bg-white/5 text-foreground/80 hover:bg-white/10"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-1/2">
          <select
            value={categoryMainFilter}
            onChange={(e) => {
              const v = e.target.value;
              setCategoryMainFilter(v);
              setCategoryFormFilter("all");
              setCategoryGenreFilter("all");
              replaceLibraryUrl({
                categoryMainFilter: v,
                categoryFormFilter: "all",
                categoryGenreFilter: "all",
              });
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
          >
            <option value="all">All category mains</option>
            <option value="uncategorized">Uncategorized (main)</option>
            {(categorySettings?.mainCategories ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || "Untitled"}
              </option>
            ))}
          </select>
          <select
            value={placementRoomFilter}
            onChange={(e) => {
              const v = e.target.value;
              setPlacementRoomFilter(v);
              replaceLibraryUrl({ placementRoomFilter: v });
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
          >
            <option value="all">All rooms</option>
            {placementRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {labelPlacementRoom(r)}
              </option>
            ))}
          </select>
          <select
            value={readingStatus}
            onChange={(e) => {
              const v = e.target.value;
              setReadingStatus(v);
              replaceLibraryUrl({ readingStatus: v });
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
          >
            {readingStatuses.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
        </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
            Gifts · signed · lent
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={filterGift}
              onClick={() => {
                const next = !filterGift;
                setFilterGift(next);
                replaceLibraryUrl({ filterGift: next });
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                filterGift
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                  : "border-white/10 bg-white/5 text-foreground/75 hover:border-amber-400/20 hover:bg-amber-500/10"
              }`}
            >
              Gifts
            </button>
            <button
              type="button"
              aria-pressed={filterSigned}
              onClick={() => {
                const next = !filterSigned;
                setFilterSigned(next);
                replaceLibraryUrl({ filterSigned: next });
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                filterSigned
                  ? "border-rose-400/35 bg-rose-500/15 text-rose-100"
                  : "border-white/10 bg-white/5 text-foreground/75 hover:border-rose-400/25 hover:bg-rose-500/10"
              }`}
            >
              Signed
            </button>
            <button
              type="button"
              aria-pressed={filterLent}
              onClick={() => {
                const next = !filterLent;
                setFilterLent(next);
                replaceLibraryUrl({ filterLent: next });
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                filterLent
                  ? "border-sky-400/35 bg-sky-500/15 text-sky-100"
                  : "border-white/10 bg-white/5 text-foreground/75 hover:border-sky-400/25 hover:bg-sky-500/10"
              }`}
            >
              Lent out
            </button>
          </div>
        </div>
      </div>

      {bulkMode && selectedIds.length === 0 && filtered.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-foreground/85">
          <span>
            Bulk edit: tap books below to select. Only books matching current filters are listed.
          </span>
          <button
            type="button"
            onClick={exitBulkMode}
            className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
          >
            Done
          </button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="text-sm text-foreground/70">No books match your filters.</div>
        </div>
      ) : (
        <BookList
          books={filtered}
          onEdit={onEdit}
          viewMode={viewMode}
          taxonomyLookups={mobileLookups}
          bulkMode={bulkMode}
          selectedIdSet={bulkMode ? selectedSet : null}
          onBulkToggle={bulkMode ? toggleBulkSelection : undefined}
        />
      )}

      <BulkBooksToolbar
        selectedCount={selectedIds.length}
        filteredCount={filtered.length}
        onSelectAllFiltered={() => setSelectedIds(filtered.map((b) => b.id))}
        onOpenStatus={() => setBulkDialog("status")}
        onOpenCategory={() => setBulkDialog("category")}
        onOpenPlacement={() => setBulkDialog("placement")}
        onOpenDelete={() => setBulkDialog("delete")}
        onExitBulk={exitBulkMode}
      />

      <BulkBookModals
        userId={user?.uid ?? ""}
        selectedIds={selectedIds}
        categorySettings={categorySettings}
        placementSettings={placementSettings}
        active={bulkDialog}
        onClose={() => setBulkDialog(null)}
        onCompleted={async () => {
          await load();
          setSelectedIds([]);
        }}
      />

      <BookFormModal
        isOpen={editOpen}
        mode="edit"
        userId={user?.uid}
        initialBook={editBook}
        categorySettings={categorySettings}
        placementSettings={placementSettings}
        onClose={() => {
          setEditOpen(false);
          setEditBook(null);
        }}
        onSave={async (payload) => {
          if (!user || !editBook?.id) return;
          await updateBook(user.uid, editBook.id, payload);
          await load();
        }}
        onDelete={async () => {
          if (!user || !editBook?.id) return;
          const confirmed = window.confirm("Delete this book? This cannot be undone.");
          if (!confirmed) return;
          await deleteBook(user.uid, editBook.id);
          setEditOpen(false);
          setEditBook(null);
          await load();
        }}
      />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="text-sm text-foreground/70">Loading your library…</div>
        </div>
      }
    >
      <LibraryPageContent />
    </Suspense>
  );
}
