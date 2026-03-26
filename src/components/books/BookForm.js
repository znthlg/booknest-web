"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import IsbnSearchWidget from "@/components/books/IsbnSearchWidget";
import { DEFAULT_READING_STATUS, normalizeReadingStatus } from "@/lib/readingStatus";
import {
  readLastPlacementPreference,
  resolveLastPlacementInTree,
  writeLastPlacementPreference,
} from "@/lib/lastPlacementPreference";
import {
  labelPlacementBookshelf,
  labelPlacementRoom,
  labelPlacementShelf,
} from "@/lib/taxonomyTreeMaps";
import {
  findDuplicateBooks,
  parseYearFromInput,
  publicationYearFromBook,
} from "@/lib/bookDuplicateUtils";

const readingStatusOptions = ["To Read", "Reading", "Finished", "On hold", "Abandoned"];

const MOBILE_SYNC_KEYS = ["physicalRoomId", "physicalBookshelfId", "physicalShelfId"];

function mergeMobileFieldsForSave(payload, mode, initialBook) {
  if (mode !== "edit" || !initialBook) return payload;
  const out = { ...payload };
  for (const k of MOBILE_SYNC_KEYS) {
    const v = out[k];
    const empty = v == null || v === "";
    if (empty && Object.prototype.hasOwnProperty.call(initialBook, k)) {
      out[k] = initialBook[k];
    }
  }
  return out;
}

function normalizeIsbnForStorage(raw) {
  const s = (raw || "").toString().trim().replace(/[-\s]/g, "");
  return s || "";
}

function IconGift({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875a2.625 2.625 0 1 0-2.625 2.625H12m0-2.625V7.5m0-2.625a2.625 2.625 0 1 1 2.625 2.625H12m-8.25 3.75h16.5"
      />
    </svg>
  );
}

function IconLent({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
      />
    </svg>
  );
}

function IconSigned({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

/** 2:3 kitap kapağı — `object-contain` ile oran korunur */
function BookCoverFrame({ title, coverImageUrl, thumbnailURL, footer }) {
  const src = (coverImageUrl || "").trim() || (thumbnailURL || "").trim();
  const initial = (title || "B").trim().slice(0, 1).toUpperCase();
  return (
    <div className="mx-auto w-full max-w-[min(100%,240px)]" style={{ aspectRatio: "2 / 3" }}>
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-contain object-center" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.04]">
            <span className="text-5xl font-semibold text-foreground/30">{initial}</span>
          </div>
        )}
        {footer ? <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/35 px-2 py-2 backdrop-blur-sm">{footer}</div> : null}
      </div>
    </div>
  );
}

function CopyDetailToggle({ active, onToggle, title, subtitle, icon: Icon, palette }) {
  const styles = {
    amber: active
      ? "border-amber-400/50 bg-amber-500/[0.14] text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
      : "border-white/10 bg-white/[0.04] text-foreground/85 hover:border-amber-400/30 hover:bg-amber-500/[0.06]",
    sky: active
      ? "border-sky-400/45 bg-sky-500/[0.14] text-sky-50 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]"
      : "border-white/10 bg-white/[0.04] text-foreground/85 hover:border-sky-400/28 hover:bg-sky-500/[0.06]",
    rose: active
      ? "border-rose-400/45 bg-rose-500/[0.14] text-rose-50 shadow-[0_0_0_1px_rgba(251,113,133,0.18)]"
      : "border-white/10 bg-white/[0.04] text-foreground/85 hover:border-rose-400/28 hover:bg-rose-500/[0.06]",
  };
  const iconWrap = {
    amber: active ? "bg-amber-400/20 text-amber-100" : "bg-white/10 text-amber-200/80",
    sky: active ? "bg-sky-400/20 text-sky-100" : "bg-white/10 text-sky-200/80",
    rose: active ? "bg-rose-400/20 text-rose-100" : "bg-white/10 text-rose-200/80",
  };
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onToggle(!active)}
      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${styles[palette]}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 ${iconWrap[palette]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-sm font-semibold leading-tight">{title}</span>
        <span className="mt-1 block text-[11px] leading-snug text-foreground/55">{subtitle}</span>
      </span>
    </button>
  );
}

function parseAuthorsToArray(text) {
  const raw = (text || "")
    .toString()
    .replace(/\n/g, ",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const a of raw) {
    const key = a.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

export default function BookForm({
  mode,
  initialBook,
  categorySettings,
  placementSettings,
  onSubmit,
  userId = "",
  /** @type {object[]} */ existingBooks = [],
  hidePageTitle = false,
  variant = "page",
}) {
  const formDomId = useId().replace(/:/g, "");
  const rooms = placementSettings?.rooms ?? [];

  const safeInitial = useMemo(() => {
    const authors = Array.isArray(initialBook?.authors)
      ? initialBook.authors
      : initialBook?.author
        ? [initialBook.author]
        : [];
    return {
      title: initialBook?.title || "",
      authorsText: authors.join(", "),
      categoryMainId: initialBook?.categoryMainId || "",
      categoryFormId: initialBook?.categoryFormId || "",
      categoryGenreId: initialBook?.categoryGenreId || "",
      categoryId: initialBook?.categoryId || initialBook?.categoryFormId || "",
      physicalRoomId: initialBook?.physicalRoomId || "",
      physicalBookshelfId: initialBook?.physicalBookshelfId || "",
      physicalShelfId: initialBook?.physicalShelfId || "",
      readingStatus: normalizeReadingStatus(initialBook?.readingStatus),
      notes: initialBook?.notes || "",
      language: initialBook?.language || initialBook?.publicationLanguage || "",
      coverImageUrl: initialBook?.coverImageUrl || "",
      thumbnailURL: initialBook?.thumbnailURL || "",
      isbn: initialBook?.isbn || "",
      isGift: !!initialBook?.isGift,
      isLent: !!initialBook?.isLent,
      isSigned: !!initialBook?.isSigned,
      giftedBy: initialBook?.giftedBy || "",
      lentTo: initialBook?.lentTo || "",
      publicationYear:
        initialBook?.publicationYear ??
        initialBook?.publishYear ??
        initialBook?.yearPublished ??
        initialBook?.publishedYear ??
        "",
      publisher:
        initialBook?.publisher ??
        initialBook?.publisherName ??
        initialBook?.publishingCompany ??
        "",
    };
  }, [initialBook]);

  const [title, setTitle] = useState(safeInitial.title);
  const [authorsText, setAuthorsText] = useState(safeInitial.authorsText);
  const [categoryMainId, setCategoryMainId] = useState(safeInitial.categoryMainId || "");
  const [categoryFormId, setCategoryFormId] = useState(safeInitial.categoryFormId || "");
  const [categoryGenreId, setCategoryGenreId] = useState(safeInitial.categoryGenreId || "");
  const [physicalRoomId, setPhysicalRoomId] = useState(safeInitial.physicalRoomId || "");
  const [physicalBookshelfId, setPhysicalBookshelfId] = useState(
    safeInitial.physicalBookshelfId || ""
  );
  const [physicalShelfId, setPhysicalShelfId] = useState(safeInitial.physicalShelfId || "");
  const [readingStatus, setReadingStatus] = useState(
    safeInitial.readingStatus || DEFAULT_READING_STATUS
  );
  const [notes, setNotes] = useState(safeInitial.notes);
  const [language, setLanguage] = useState(safeInitial.language);
  const [coverImageUrl, setCoverImageUrl] = useState(safeInitial.coverImageUrl);
  const [thumbnailURL, setThumbnailURL] = useState(safeInitial.thumbnailURL);
  const [isbn, setIsbn] = useState(safeInitial.isbn || "");
  const [isGift, setIsGift] = useState(safeInitial.isGift);
  const [isLent, setIsLent] = useState(safeInitial.isLent);
  const [isSigned, setIsSigned] = useState(safeInitial.isSigned);
  const [giftedBy, setGiftedBy] = useState(safeInitial.giftedBy);
  const [lentTo, setLentTo] = useState(safeInitial.lentTo);
  const [publicationYear, setPublicationYear] = useState(
    safeInitial.publicationYear != null ? String(safeInitial.publicationYear) : ""
  );
  const [publisher, setPublisher] = useState(
    safeInitial.publisher != null ? String(safeInitial.publisher) : ""
  );
  const [titleSearchResults, setTitleSearchResults] = useState([]);
  const [authorSearchResults, setAuthorSearchResults] = useState([]);
  const [titleSearchLoading, setTitleSearchLoading] = useState(false);
  const [authorSearchLoading, setAuthorSearchLoading] = useState(false);
  const [titleSearchError, setTitleSearchError] = useState("");
  const [authorSearchError, setAuthorSearchError] = useState("");
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  const [isbnError, setIsbnError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const appliedLastPlacementRef = useRef(false);
  const formRef = useRef(null);
  const duplicateBypassRef = useRef(false);
  const [duplicateModal, setDuplicateModal] = useState(
    /** @type {{ matches: object[] } | null} */ (null)
  );

  const mains = categorySettings?.mainCategories ?? [];
  const selectedMain = mains.find((m) => m.id === categoryMainId);
  const forms = selectedMain?.forms ?? [];
  const selectedForm = forms.find((f) => f.id === categoryFormId);
  const genres = selectedForm?.genres ?? [];
  const selectedGenre = genres.find((g) => g.id === categoryGenreId);

  const selectedRoom = rooms.find((r) => r.id === physicalRoomId);
  const bookshelves = selectedRoom?.bookshelves ?? [];
  const selectedBookshelf = bookshelves.find((b) => b.id === physicalBookshelfId);
  const shelfSlots = selectedBookshelf?.shelves ?? [];
  const selectedShelf = shelfSlots.find((s) => s.id === physicalShelfId);

  const placementLine = useMemo(() => {
    const parts = [
      selectedRoom ? labelPlacementRoom(selectedRoom) : "",
      selectedBookshelf ? labelPlacementBookshelf(selectedBookshelf) : "",
      selectedShelf ? labelPlacementShelf(selectedShelf) : "",
    ]
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    return parts.join(" · ");
  }, [selectedRoom, selectedBookshelf, selectedShelf]);

  const isAddMode = mode === "add";

  useEffect(() => {
    setTitle(safeInitial.title);
    setAuthorsText(safeInitial.authorsText);
    setCategoryMainId(safeInitial.categoryMainId || "");
    setCategoryFormId(safeInitial.categoryFormId || "");
    setCategoryGenreId(safeInitial.categoryGenreId || "");
    /* Add flow with empty initialBook: placement comes from last-save prefs (layout effect), not cleared here. */
    if (!(mode === "add" && !initialBook)) {
      setPhysicalRoomId(safeInitial.physicalRoomId || "");
      setPhysicalBookshelfId(safeInitial.physicalBookshelfId || "");
      setPhysicalShelfId(safeInitial.physicalShelfId || "");
    }
    setReadingStatus(safeInitial.readingStatus || DEFAULT_READING_STATUS);
    setNotes(safeInitial.notes);
    setLanguage(safeInitial.language);
    setCoverImageUrl(safeInitial.coverImageUrl);
    setThumbnailURL(safeInitial.thumbnailURL);
    setIsbn(safeInitial.isbn || "");
    setIsGift(safeInitial.isGift);
    setIsLent(safeInitial.isLent);
    setIsSigned(safeInitial.isSigned);
    setGiftedBy(safeInitial.giftedBy);
    setLentTo(safeInitial.lentTo);
    setPublicationYear(
      safeInitial.publicationYear != null ? String(safeInitial.publicationYear) : ""
    );
    setPublisher(safeInitial.publisher != null ? String(safeInitial.publisher) : "");
  }, [safeInitial, mode, initialBook]);

  useLayoutEffect(() => {
    if (mode === "edit") {
      appliedLastPlacementRef.current = false;
      return;
    }
    if (appliedLastPlacementRef.current) return;
    const rlist = placementSettings?.rooms ?? [];
    if (!userId || !rlist.length) return;

    const placementEmpty =
      !safeInitial.physicalRoomId &&
      !safeInitial.physicalBookshelfId &&
      !safeInitial.physicalShelfId;
    if (!placementEmpty) {
      appliedLastPlacementRef.current = true;
      return;
    }

    const stored = readLastPlacementPreference(userId);
    if (!stored) {
      appliedLastPlacementRef.current = true;
      return;
    }
    const resolved = resolveLastPlacementInTree(rlist, stored);
    if (resolved.physicalRoomId) setPhysicalRoomId(resolved.physicalRoomId);
    if (resolved.physicalBookshelfId) setPhysicalBookshelfId(resolved.physicalBookshelfId);
    if (resolved.physicalShelfId) setPhysicalShelfId(resolved.physicalShelfId);
    appliedLastPlacementRef.current = true;
  }, [
    mode,
    userId,
    placementSettings,
    safeInitial.physicalRoomId,
    safeInitial.physicalBookshelfId,
    safeInitial.physicalShelfId,
  ]);

  const setFromIsbn = (data) => {
    setIsbnError("");
    if (data?.isbn) setIsbn(data.isbn);
    if (data?.title) setTitle(data.title);
    if (Array.isArray(data?.authors) && data.authors.length) {
      setAuthorsText(data.authors.join(", "));
    }
    if (data?.language) setLanguage(data.language);
    const pub = (data?.publisher && String(data.publisher).trim()) || "";
    if (pub) setPublisher(pub);
    if (data?.coverImageUrl) {
      setCoverImageUrl(data.coverImageUrl);
      setThumbnailURL(data.coverImageUrl);
    }
  };

  const applyBookSearchSelection = (data) => {
    if (!data || typeof data !== "object") return;
    if (data.title) setTitle(String(data.title));
    if (Array.isArray(data.authors) && data.authors.length) {
      setAuthorsText(data.authors.join(", "));
    }
    if (data.language) setLanguage(String(data.language));
    if (data.publisher) setPublisher(String(data.publisher));
    if (data.publicationYear) setPublicationYear(String(data.publicationYear));
    if (data.isbn) setIsbn(normalizeIsbnForStorage(data.isbn));
    if (data.coverImageUrl) {
      setCoverImageUrl(String(data.coverImageUrl));
      setThumbnailURL(String(data.coverImageUrl));
    }
  };

  useEffect(() => {
    const q = title.trim();
    if (!showTitleDropdown || q.length < 2) {
      setTitleSearchResults([]);
      setTitleSearchError("");
      setTitleSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setTitleSearchLoading(true);
      setTitleSearchError("");
      try {
        const r = await fetch(
          `/api/book-search?q=${encodeURIComponent(q)}&field=${encodeURIComponent("title")}`
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Search failed.");
        setTitleSearchResults(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        setTitleSearchResults([]);
        setTitleSearchError(err?.message || "Search failed.");
      } finally {
        setTitleSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [showTitleDropdown, title]);

  const authorQuery = useMemo(() => {
    const parts = (authorsText || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts[parts.length - 1] || "";
  }, [authorsText]);

  useEffect(() => {
    const q = authorQuery.trim();
    if (!showAuthorDropdown || q.length < 2) {
      setAuthorSearchResults([]);
      setAuthorSearchError("");
      setAuthorSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setAuthorSearchLoading(true);
      setAuthorSearchError("");
      try {
        const r = await fetch(
          `/api/book-search?q=${encodeURIComponent(q)}&field=${encodeURIComponent("author")}`
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Search failed.");
        setAuthorSearchResults(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        setAuthorSearchResults([]);
        setAuthorSearchError(err?.message || "Search failed.");
      } finally {
        setAuthorSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [authorQuery, showAuthorDropdown]);

  const submit = async (e) => {
    e.preventDefault();
    setIsbnError("");

    const authors = parseAuthorsToArray(authorsText);

    let effectiveCategoryMainId = (categoryMainId || "").trim();
    let effectiveCategoryFormId = (categoryFormId || "").trim();
    let effectiveCategoryGenreId = (categoryGenreId || "").trim();
    let category = "";

    if (isAddMode) {
      if (!effectiveCategoryMainId) {
        effectiveCategoryMainId = "";
        effectiveCategoryFormId = "";
        effectiveCategoryGenreId = "";
        category = "Uncategorized";
      } else if (!effectiveCategoryFormId) {
        const mainOnly = mains.find((m) => m.id === effectiveCategoryMainId);
        if (!mainOnly) {
          setIsbnError("Invalid category (main).");
          return;
        }
        effectiveCategoryFormId = "";
        effectiveCategoryGenreId = "";
        category = (mainOnly.name || "").trim() || "Uncategorized";
      } else {
        const mainEl = mains.find((m) => m.id === effectiveCategoryMainId);
        const formEl = mainEl?.forms?.find((f) => f.id === effectiveCategoryFormId);
        if (!mainEl || !formEl) {
          setIsbnError("Invalid category selection.");
          return;
        }
        const genreEl = effectiveCategoryGenreId
          ? formEl.genres?.find((g) => g.id === effectiveCategoryGenreId)
          : null;
        effectiveCategoryGenreId = genreEl ? effectiveCategoryGenreId : "";
        const categoryParts = [
          mainEl.name,
          formEl.name,
          genreEl?.name,
        ].filter(Boolean);
        category = categoryParts.join(" · ");
      }
    } else {
      const categoryParts = [
        selectedMain?.name,
        selectedForm?.name,
        selectedGenre?.name,
      ].filter(Boolean);
      category = categoryParts.join(" · ");
    }

    if (!title.trim()) {
      setIsbnError("Title is required.");
      return;
    }
    const skipDupCheck = duplicateBypassRef.current;
    if (skipDupCheck) duplicateBypassRef.current = false;

    if (isAddMode && existingBooks?.length > 0 && !skipDupCheck) {
      const matches = findDuplicateBooks(existingBooks, {
        isbn: normalizeIsbnForStorage(isbn),
        title: title.trim(),
        authors,
      });
      if (matches.length) {
        setDuplicateModal({ matches });
        return;
      }
    }

    setSubmitting(true);
    try {
      const lang = language.trim();
      const thumb = thumbnailURL.trim() || coverImageUrl.trim();
      const yearStr = publicationYear.trim();
      const payload = mergeMobileFieldsForSave(
        {
          title: title.trim(),
          authors,
          categoryMainId: isAddMode ? effectiveCategoryMainId : categoryMainId,
          categoryFormId: isAddMode ? effectiveCategoryFormId : categoryFormId,
          categoryGenreId: isAddMode ? effectiveCategoryGenreId : categoryGenreId || "",
          categoryId: isAddMode
            ? effectiveCategoryFormId || ""
            : categoryFormId,
          category,
          readingStatus: normalizeReadingStatus(readingStatus),
          notes: notes.toString(),
          language: lang,
          publicationLanguage: lang,
          publicationYear: yearStr,
          publisher: publisher.trim(),
          coverImageUrl: coverImageUrl.trim() || thumb,
          thumbnailURL: thumb,
          isbn: normalizeIsbnForStorage(isbn),
          isGift,
          isLent,
          isSigned,
          giftedBy: giftedBy.trim(),
          lentTo: lentTo.trim(),
          physicalRoomId,
          physicalBookshelfId,
          physicalShelfId,
          location: placementLine,
        },
        mode,
        initialBook
      );
      await onSubmit(payload);
      if (userId && physicalRoomId && physicalBookshelfId && physicalShelfId) {
        writeLastPlacementPreference(userId, {
          physicalRoomId,
          physicalBookshelfId,
          physicalShelfId,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const footerBleed =
    variant === "modal"
      ? "sticky bottom-0 z-10 -mx-4 mt-8 border-t border-white/10 bg-[var(--background)]/95 px-4 py-4 shadow-[0_-12px_32px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md sm:-mx-6 sm:px-6"
      : "sticky bottom-0 z-10 mt-10 border-t border-white/10 bg-[var(--background)]/95 py-5 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--background)]/88";
  const submitWrapClass =
    variant === "page" && isAddMode ? "flex justify-end" : "";
  const submitBtnClass =
    variant === "page" && isAddMode
      ? "rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
      : "w-full rounded-2xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60";

  const duplicateYearTip = useMemo(() => {
    if (!duplicateModal?.matches?.length) return { show: false, text: "" };
    const years = [
      ...new Set(
        duplicateModal.matches.map(publicationYearFromBook).filter((y) => y != null)
      ),
    ].sort((a, b) => a - b);
    if (!years.length) return { show: false, text: "" };
    const incoming = parseYearFromInput(publicationYear);
    const differs =
      incoming == null || years.some((y) => y !== incoming);
    if (!differs) return { show: false, text: "" };
    const yLabel =
      years.length === 1 ? `${years[0]}` : years.join(", ");
    return {
      show: true,
      text: `A copy already in your library lists publication year: ${yLabel}. If this is a different printing or edition, enter this copy’s year in Publication year below so the entries are easy to tell apart.`,
    };
  }, [duplicateModal, publicationYear]);

  return (
    <>
    <form ref={formRef} id={formDomId} onSubmit={submit} className="space-y-5 pb-2">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_min(280px,32vw)]">
        <div className="space-y-5">
          {!hidePageTitle ? (
            <div>
              <div className="mb-1 text-xs tracking-widest text-foreground/70">
                {mode === "edit" ? "EDIT BOOK" : "ADD BOOK"}
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {mode === "edit" ? "Update your copy" : "Add to your collection"}
              </h1>
              <p className="mt-2 text-sm text-foreground/60">
                Fill everything now, and refine later.
              </p>
            </div>
          ) : null}

          <div className="lg:hidden">
            <BookCoverFrame
              title={title}
              coverImageUrl={coverImageUrl}
              thumbnailURL={thumbnailURL}
              footer={
                coverImageUrl || thumbnailURL ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageUrl("");
                      setThumbnailURL("");
                    }}
                    className="w-full rounded-lg bg-white/10 px-2 py-1.5 text-center text-xs font-medium text-foreground/90 hover:bg-white/15"
                  >
                    Remove cover
                  </button>
                ) : null
              }
            />
          </div>

          <IsbnSearchWidget
            isbn={isbn}
            onIsbnChange={setIsbn}
            onResult={setFromIsbn}
            onError={setIsbnError}
          />

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Title
                </label>
                <div className="relative">
                  <input
                    value={title}
                    onFocus={() => setShowTitleDropdown(true)}
                    onBlur={() => setTimeout(() => setShowTitleDropdown(false), 150)}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setShowTitleDropdown(true);
                    }}
                    type="text"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                    required
                  />
                  {showTitleDropdown && title.trim().length >= 2 ? (
                    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-auto rounded-2xl border border-white/12 bg-[var(--background)]/95 p-2 shadow-xl backdrop-blur-md">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                        Book title search
                      </div>
                      {titleSearchLoading ? (
                        <div className="px-2 py-2 text-xs text-foreground/60">Searching…</div>
                      ) : titleSearchError ? (
                        <div className="px-2 py-2 text-xs text-rose-200">{titleSearchError}</div>
                      ) : titleSearchResults.length === 0 ? (
                        <div className="px-2 py-2 text-xs text-foreground/60">No matches found.</div>
                      ) : (
                        <div className="space-y-1">
                          {titleSearchResults.map((item, idx) => (
                            <button
                              key={`${item.sourceKey || item.title}-${idx}`}
                              type="button"
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                applyBookSearchSelection(item);
                                setShowTitleDropdown(false);
                              }}
                            >
                              <div className="text-sm font-medium text-foreground/90">
                                {item.title || "Untitled"}
                              </div>
                              <div className="mt-0.5 line-clamp-1 text-xs text-foreground/65">
                                {(Array.isArray(item.authors) ? item.authors.join(", ") : "") ||
                                  "Author unknown"}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Authors
                </label>
                <div className="relative">
                  <textarea
                    value={authorsText}
                    onFocus={() => setShowAuthorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowAuthorDropdown(false), 150)}
                    onChange={(e) => {
                      setAuthorsText(e.target.value);
                      setShowAuthorDropdown(true);
                    }}
                    rows={2}
                    className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                    placeholder="Comma-separated (e.g. Neil Gaiman, Terry Pratchett)"
                  />
                  {showAuthorDropdown && authorQuery.trim().length >= 2 ? (
                    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-auto rounded-2xl border border-white/12 bg-[var(--background)]/95 p-2 shadow-xl backdrop-blur-md">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                        Author search
                      </div>
                      {authorSearchLoading ? (
                        <div className="px-2 py-2 text-xs text-foreground/60">Searching…</div>
                      ) : authorSearchError ? (
                        <div className="px-2 py-2 text-xs text-rose-200">{authorSearchError}</div>
                      ) : authorSearchResults.length === 0 ? (
                        <div className="px-2 py-2 text-xs text-foreground/60">No matches found.</div>
                      ) : (
                        <div className="space-y-1">
                          {authorSearchResults.map((item, idx) => (
                            <button
                              key={`${item.sourceKey || item.title}-author-${idx}`}
                              type="button"
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                applyBookSearchSelection(item);
                                setShowAuthorDropdown(false);
                              }}
                            >
                              <div className="text-sm font-medium text-foreground/90">
                                {item.title || "Untitled"}
                              </div>
                              <div className="mt-0.5 line-clamp-1 text-xs text-foreground/65">
                                {(Array.isArray(item.authors) ? item.authors.join(", ") : "") ||
                                  "Author unknown"}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-foreground/60">
                  {parseAuthorsToArray(authorsText).length} author(s)
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Reading status
                </label>
                <select
                  value={readingStatus}
                  onChange={(e) => setReadingStatus(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                >
                  {readingStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Category (main → form → genre)
                </label>
                {isAddMode ? (
                  <p className="mb-2 text-xs text-foreground/55">
                    All optional—leave empty to save as <span className="text-foreground/75">Uncategorized</span>.
                  </p>
                ) : null}
                {!mains.length ? (
                  <p className="text-sm text-amber-200/90">
                    Category catalog is loading. Refresh in a moment or check your connection.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <select
                      value={categoryMainId}
                      onChange={(e) => {
                        setCategoryMainId(e.target.value);
                        setCategoryFormId("");
                        setCategoryGenreId("");
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                    >
                      <option value="">Uncategorized</option>
                      {mains.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={categoryFormId}
                      onChange={(e) => {
                        setCategoryFormId(e.target.value);
                        setCategoryGenreId("");
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                      disabled={!categoryMainId}
                    >
                      <option value="">No form</option>
                      {forms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={categoryGenreId}
                      onChange={(e) => setCategoryGenreId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                      disabled={!categoryFormId || !genres.length}
                    >
                      <option value="">Genre (optional)</option>
                      {genres.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Placement (room → bookshelf → shelf)
                </label>
                {!rooms.length ? (
                  <p className="text-sm text-amber-200/90">
                    Placement settings are loading. Open the dashboard once to sync defaults.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <select
                      value={physicalRoomId}
                      onChange={(e) => {
                        setPhysicalRoomId(e.target.value);
                        setPhysicalBookshelfId("");
                        setPhysicalShelfId("");
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                    >
                      <option value="">
                        No room
                      </option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {labelPlacementRoom(r)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={physicalBookshelfId}
                      onChange={(e) => {
                        setPhysicalBookshelfId(e.target.value);
                        setPhysicalShelfId("");
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                      disabled={!physicalRoomId}
                    >
                      <option value="">
                        No bookshelf
                      </option>
                      {bookshelves.map((b) => (
                        <option key={b.id} value={b.id}>
                          {labelPlacementBookshelf(b)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={physicalShelfId}
                      onChange={(e) => setPhysicalShelfId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                      disabled={!physicalBookshelfId}
                    >
                      <option value="">
                        No shelf
                      </option>
                      {shelfSlots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {labelPlacementShelf(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-foreground/80">
                  This copy
                </label>
                <p className="mb-3 text-xs text-foreground/50">
                  Gift, loan, and signature flags — tap to toggle.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <CopyDetailToggle
                    active={isGift}
                    onToggle={setIsGift}
                    title="Gift"
                    subtitle="You received this book as a gift"
                    icon={IconGift}
                    palette="amber"
                  />
                  <CopyDetailToggle
                    active={isLent}
                    onToggle={setIsLent}
                    title="Lent out"
                    subtitle="Currently with someone else"
                    icon={IconLent}
                    palette="sky"
                  />
                  <CopyDetailToggle
                    active={isSigned}
                    onToggle={setIsSigned}
                    title="Signed"
                    subtitle="Author or personal inscription"
                    icon={IconSigned}
                    palette="rose"
                  />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className={!isGift ? "opacity-40 transition-opacity" : ""}>
                    <label className="mb-1 block text-sm font-medium text-foreground/80">
                      Gifted by
                    </label>
                    <input
                      value={giftedBy}
                      onChange={(e) => setGiftedBy(e.target.value)}
                      type="text"
                      disabled={!isGift}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50 disabled:cursor-not-allowed"
                      placeholder="Name or note"
                    />
                  </div>
                  <div className={!isLent ? "opacity-40 transition-opacity" : ""}>
                    <label className="mb-1 block text-sm font-medium text-foreground/80">
                      Lent to
                    </label>
                    <input
                      value={lentTo}
                      onChange={(e) => setLentTo(e.target.value)}
                      type="text"
                      disabled={!isLent}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50 disabled:cursor-not-allowed"
                      placeholder="Borrower"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                  placeholder="Add what matters: editions, where you left off, thoughts…"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Language (optional)
                </label>
                <input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                  placeholder="e.g. en"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Publication year (optional)
                </label>
                <input
                  value={publicationYear}
                  onChange={(e) => setPublicationYear(e.target.value)}
                  type="text"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                  placeholder="e.g. 2019"
                />
                <p className="mt-1 text-xs text-foreground/45">
                  Use for different editions or printings of the same work.
                </p>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Publisher (optional)
                </label>
                <input
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                  placeholder="Filled from ISBN search when available"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-sm font-medium text-foreground/80">
                  Thumbnail URL (optional)
                </label>
                <input
                  value={thumbnailURL}
                  onChange={(e) => setThumbnailURL(e.target.value)}
                  type="url"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                  placeholder="Cover image URL (syncs with iOS thumbnailURL)"
                />
                <p className="mt-1 text-xs text-foreground/45">
                  ISBN lookup or this field sets the cover. Preview uses book proportions (2∶3) on mobile (top) and desktop (sidebar).
                </p>
              </div>
            </div>
          </div>

          {isbnError ? (
            <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {isbnError}
            </p>
          ) : null}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-20">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                Cover preview
              </div>
              <div className="mt-4">
                <BookCoverFrame
                  title={title}
                  coverImageUrl={coverImageUrl}
                  thumbnailURL={thumbnailURL}
                  footer={
                    coverImageUrl || thumbnailURL ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageUrl("");
                          setThumbnailURL("");
                        }}
                        className="w-full rounded-lg bg-white/10 px-2 py-1.5 text-center text-xs font-medium text-foreground/90 hover:bg-white/15"
                      >
                        Remove cover
                      </button>
                    ) : null
                  }
                />
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold text-foreground line-clamp-1">
                  {title || "Untitled"}
                </div>
                <div className="mt-1 text-sm text-foreground/70 line-clamp-1">
                  {parseAuthorsToArray(authorsText).join(", ")}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedMain && selectedForm ? (
                    <span className="max-w-full rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/80 line-clamp-2">
                      {[selectedMain.name, selectedForm.name, selectedGenre?.name]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : isAddMode && !categoryMainId ? (
                    <span className="max-w-full rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/80 line-clamp-2">
                      Uncategorized
                    </span>
                  ) : isAddMode && selectedMain && !categoryFormId ? (
                    <span className="max-w-full rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/80 line-clamp-2">
                      {selectedMain.name}
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/60">
                      Choose category
                    </span>
                  )}
                  {placementLine ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/80">
                      {placementLine}
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/60">
                      Choose placement
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={footerBleed}>
        <div className={submitWrapClass}>
        <button
          type="submit"
          disabled={submitting}
          className={submitBtnClass}
        >
          {submitting
            ? mode === "edit"
              ? "Saving changes…"
              : "Adding book…"
            : mode === "edit"
              ? "Save changes"
              : "Add book"}
        </button>
        </div>
      </div>
    </form>

    {duplicateModal ? (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-modal-title"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          aria-label="Close dialog"
          onClick={() => setDuplicateModal(null)}
        />
        <div className="relative max-h-[min(90vh,28rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-amber-400/25 bg-[var(--background)] p-5 shadow-2xl">
          <h2 id="dup-modal-title" className="text-base font-semibold text-foreground/95">
            Already in your library?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/70">
            This matches a book you added before (same ISBN, or same title and authors). Add another
            copy only if you mean to keep a second entry.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-foreground/80">
            {duplicateModal.matches.slice(0, 5).map((b, idx) => {
              const py = publicationYearFromBook(b);
              return (
                <li key={b.id ?? `${b.title}-${idx}`}>
                  <span className="font-medium">{b.title || "Untitled"}</span>
                  {py != null ? <span className="text-foreground/55"> · {py}</span> : null}
                </li>
              );
            })}
          </ul>
          {duplicateModal.matches.length > 5 ? (
            <p className="mt-1 text-xs text-foreground/50">
              +{duplicateModal.matches.length - 5} more
            </p>
          ) : null}
          {duplicateYearTip.show ? (
            <p className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-100/90">
              {duplicateYearTip.text}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              className="rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
              onClick={() => {
                setDuplicateModal(null);
                duplicateBypassRef.current = true;
                formRef.current?.requestSubmit();
              }}
            >
              Add anyway
            </button>
            <button
              type="button"
              disabled={submitting}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-foreground/85 hover:bg-white/10 disabled:opacity-50"
              onClick={() => setDuplicateModal(null)}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
