"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { backfillCoversForBooks } from "@/lib/backfillBookCovers";
import { loadMobileTaxonomyLookups } from "@/lib/mobileBookLookups";
import { getPlacementRest, getPlacementRoom } from "@/lib/bookPlacement";
import { getCategorySettings } from "@/lib/categoryCatalogApi";
import { getPlacementSettings } from "@/lib/placementSettingsApi";
import {
  labelPlacementBookshelf,
  labelPlacementRoom,
  labelPlacementShelf,
} from "@/lib/taxonomyTreeMaps";
import {
  computeShelfDashboard,
  readingDonutGradient,
} from "@/lib/shelfDashboardStats";

const serif = { fontFamily: "Georgia, ui-serif, Cambria, serif" };

function sortBooksByTitle(a, b) {
  const t = (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
  if (t !== 0) return t;
  return (a.id || "").localeCompare(b.id || "");
}

function subscribeToPrefersLight(callback) {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getPrefersLightSnapshot() {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function getPrefersLightServerSnapshot() {
  return false;
}

function usePrefersLight() {
  return useSyncExternalStore(
    subscribeToPrefersLight,
    getPrefersLightSnapshot,
    getPrefersLightServerSnapshot
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/50">
      {children}
    </div>
  );
}

function MetricTile({ value, label, href, valueClass = "" }) {
  const inner = (
    <>
      <div
        className={`text-[26px] font-light tabular-nums leading-none text-foreground sm:text-[28px] ${valueClass}`}
        style={serif}
      >
        {value}
      </div>
      <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
        {label}
      </div>
    </>
  );
  const cls =
    "block min-w-0 flex-1 rounded-xl p-3 text-left transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

function categoryStatHref(row) {
  const f = row.filter;
  if (f.type === "main") {
    return `/dashboard/books?main=${encodeURIComponent(f.id)}`;
  }
  if (f.type === "uncategorized-main") {
    return `/dashboard/books?main=uncategorized`;
  }
  if (f.type === "form") {
    return `/dashboard/books?form=${encodeURIComponent(f.id)}`;
  }
  if (f.type === "uncategorized-form") {
    return `/dashboard/books?form=uncategorized`;
  }
  if (f.type === "genre") {
    return `/dashboard/books?genre=${encodeURIComponent(f.id)}`;
  }
  if (f.type === "uncategorized-genre") {
    return `/dashboard/books?genre=uncategorized`;
  }
  return "/dashboard/books";
}

function readingStatusHref(slice) {
  if (slice.key === "read") {
    return `/dashboard/books?status=${encodeURIComponent("Finished")}`;
  }
  return `/dashboard/books?status=${encodeURIComponent(slice.status)}`;
}

function BookCoverThumb({ book, router }) {
  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/books/${book.id}/edit`)}
      className="flex w-24 shrink-0 items-start justify-center rounded-2xl border border-white/10 bg-white/5 p-2 transition hover:border-white/20 hover:bg-white/10"
    >
      {book.coverImageUrl || book.thumbnailURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImageUrl || book.thumbnailURL}
          alt={book.title || "Book"}
          className="h-32 w-auto object-contain"
        />
      ) : (
        <div className="text-sm font-semibold text-foreground/60">
          {(book.title || "B").trim().slice(0, 1).toUpperCase()}
        </div>
      )}
    </button>
  );
}

export default function ShelfPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const prefersLight = usePrefersLight();

  const [books, setBooks] = useState([]);
  const [categorySettings, setCategorySettings] = useState(null);
  const [placementSettings, setPlacementSettings] = useState(null);
  const [mobileLookups, setMobileLookups] = useState({});
  const [profileLine, setProfileLine] = useState("");
  const [error, setError] = useState("");
  const [showAuthorsExpanded, setShowAuthorsExpanded] = useState(false);
  const [layoutMode, setLayoutMode] = useState("home");

  useEffect(() => {
    const run = async () => {
      if (loading || !user) return;
      setError("");
      try {
        const [snap, taxonomy, catTree, accountSnap, placement] = await Promise.all([
          getDocs(collection(db, "users", user.uid, "books")),
          loadMobileTaxonomyLookups(user.uid),
          getCategorySettings(user.uid),
          getDoc(doc(db, "users", user.uid, "settings", "account")),
          getPlacementSettings(user.uid),
        ]);
        setMobileLookups(taxonomy);
        setCategorySettings(catTree);
        setPlacementSettings(placement);
        let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBooks(list);

        const acc = accountSnap.exists() ? accountSnap.data() : null;
        const first = (acc?.firstName || "").toString().trim();
        const last = (acc?.lastName || "").toString().trim();
        const combined = [first, last].filter(Boolean).join(" ");
        setProfileLine(
          combined ||
            user.displayName?.trim() ||
            user.email?.split("@")[0] ||
            ""
        );

        const n = await backfillCoversForBooks(user.uid, list);
        if (n > 0) {
          const snap2 = await getDocs(collection(db, "users", user.uid, "books"));
          list = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
          setBooks(list);
        }
      } catch (err) {
        setError(err?.message || "Failed to load shelves.");
      }
    };
    run();
  }, [loading, user]);

  const dashboard = useMemo(
    () =>
      computeShelfDashboard(books, categorySettings, {
        colorScheme: prefersLight ? "light" : "dark",
      }),
    [books, categorySettings, prefersLight]
  );

  const donutGradient = useMemo(
    () => readingDonutGradient(dashboard.readingSlices),
    [dashboard.readingSlices]
  );

  /** Full physical tree from Firestore placement, or legacy grouping from book labels. */
  const physicalSections = useMemo(() => {
    if (placementSettings?.rooms?.length) {
      return placementSettings.rooms.map((room) => ({
        key: room.id,
        roomTitle: labelPlacementRoom(room),
        bookshelves: (room.bookshelves ?? []).map((bs) => ({
          key: bs.id,
          bookshelfTitle: labelPlacementBookshelf(bs),
          shelves: (bs.shelves ?? []).map((sh) => ({
            key: sh.id,
            shelfTitle: labelPlacementShelf(sh),
            books: books
              .filter(
                (b) =>
                  b.physicalRoomId === room.id &&
                  b.physicalBookshelfId === bs.id &&
                  b.physicalShelfId === sh.id
              )
              .sort(sortBooksByTitle),
          })),
        })),
      }));
    }

    const byRoomName = new Map();
    for (const b of books) {
      const room = getPlacementRoom(b, mobileLookups);
      if (!room) continue;
      const rest = getPlacementRest(b, mobileLookups);
      if (!byRoomName.has(room)) byRoomName.set(room, new Map());
      const shelfMap = byRoomName.get(room);
      if (!shelfMap.has(rest)) shelfMap.set(rest, []);
      shelfMap.get(rest).push(b);
    }

    return Array.from(byRoomName.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([roomTitle, shelfMap]) => ({
        key: `legacy-${roomTitle}`,
        roomTitle,
        bookshelves: [
          {
            key: "legacy-bs",
            bookshelfTitle: "",
            shelves: Array.from(shelfMap.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([shelfTitle, list]) => ({
                key: shelfTitle,
                shelfTitle,
                books: list.sort(sortBooksByTitle),
              })),
          },
        ],
      }));
  }, [books, placementSettings, mobileLookups]);

  /** By room: only shelves (and parents) that have at least one book. */
  const physicalSectionsWithBooks = useMemo(() => {
    return physicalSections
      .map((room) => ({
        ...room,
        bookshelves: room.bookshelves
          .map((bs) => ({
            ...bs,
            shelves: bs.shelves.filter((sh) => sh.books.length > 0),
          }))
          .filter((bs) => bs.shelves.length > 0),
      }))
      .filter((room) => room.bookshelves.length > 0);
  }, [physicalSections]);

  const authorsShown = showAuthorsExpanded
    ? dashboard.topAuthors
    : dashboard.topAuthors.slice(0, 3);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <div className="text-sm text-foreground/70">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  const layoutToggle = (
    <div className="flex shrink-0 gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-medium self-start pt-0.5 sm:pt-1">
      <button
        type="button"
        onClick={() => setLayoutMode("home")}
        className={`rounded-full px-3 py-1.5 transition ${
          layoutMode === "home"
            ? "bg-indigo-500/25 text-indigo-200"
            : "text-foreground/65 hover:text-foreground/85"
        }`}
      >
        Overview
      </button>
      <button
        type="button"
        onClick={() => setLayoutMode("rooms")}
        className={`rounded-full px-3 py-1.5 transition ${
          layoutMode === "rooms"
            ? "bg-indigo-500/25 text-indigo-200"
            : "text-foreground/65 hover:text-foreground/85"
        }`}
      >
        By room
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 border-b border-indigo-400/25 pb-5">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="h-14 w-14 overflow-hidden rounded-full border border-white/15 bg-white/5 shadow-md ring-2 ring-indigo-400/20 ring-offset-2 ring-offset-[var(--background)]">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl text-foreground/45">
                  ○
                </div>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <h1
                className="text-[1.65rem] font-normal leading-tight tracking-tight text-foreground sm:text-[1.85rem]"
                style={serif}
              >
                {profileLine || "Your library"}
              </h1>
              <p className="mt-2 text-sm italic text-foreground/55" style={serif}>
                Library at a glance
              </p>
            </div>
            {layoutToggle}
          </div>
        </div>
      </header>

      {layoutMode === "rooms" ? (
        <div className="space-y-12">
          {!physicalSectionsWithBooks.length ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-foreground/65">
              No books on shelves yet. Assign a physical room and shelf on each book to see them here.
            </div>
          ) : (
            physicalSectionsWithBooks.map((room) => (
              <section key={room.key} className="scroll-mt-4">
                <h2
                  className="mb-5 border-b border-white/10 pb-2 text-xl font-normal tracking-tight text-foreground/95"
                  style={serif}
                >
                  {room.roomTitle}
                </h2>
                <div className="space-y-8">
                  {room.bookshelves.map((bs) => (
                    <div key={bs.key}>
                      {bs.bookshelfTitle ? (
                        <h3 className="mb-3 text-sm font-medium tracking-wide text-foreground/65">
                          {bs.bookshelfTitle}
                        </h3>
                      ) : null}
                      <div className="space-y-4">
                        {bs.shelves.map((sh) => (
                          <div
                            key={sh.key}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                          >
                            <div className="mb-3 flex items-baseline justify-between gap-2">
                              <span
                                className="text-xs font-medium uppercase tracking-wider text-foreground/45"
                                style={serif}
                              >
                                {sh.shelfTitle}
                              </span>
                              <span className="text-[11px] tabular-nums text-foreground/45">
                                {sh.books.length} book{sh.books.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            {sh.books.length === 0 ? (
                              <p className="text-xs italic text-foreground/40">Empty shelf</p>
                            ) : (
                              <div className="flex gap-3 overflow-x-auto pb-1">
                                {sh.books.map((b) => (
                                  <BookCoverThumb key={b.id} book={b} router={router} />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 sm:p-4">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <MetricTile
                    value={dashboard.summary.totalBooks}
                    label="Volumes"
                    href="/dashboard/books"
                  />
                  <MetricTile
                    value={dashboard.summary.totalAuthors}
                    label="Authors"
                    href="/dashboard/authors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MetricTile
                    value={dashboard.summary.giftBooks}
                    label="Gifts"
                    href="/dashboard/books?gift=1"
                    valueClass="text-amber-200/95"
                  />
                  <MetricTile
                    value={dashboard.summary.signedBooks}
                    label="Signed"
                    href="/dashboard/books?signed=1"
                    valueClass="text-rose-200/90"
                  />
                </div>
              </div>

              <div className="flex flex-1 items-center gap-3 sm:max-w-[min(100%,320px)]">
                {dashboard.summary.totalBooks === 0 ? (
                  <p className="text-sm italic text-foreground/55" style={serif}>
                    Add your first book to see reading progress.
                  </p>
                ) : dashboard.readingChartTotal === 0 ? (
                  <p className="text-sm italic text-foreground/55" style={serif}>
                    Set reading status on your books to fill the chart.
                  </p>
                ) : (
                  <>
                    <div
                      className="relative h-[92px] w-[92px] shrink-0 rounded-full border border-white/10 shadow-inner"
                      style={{
                        background: donutGradient || "conic-gradient(rgb(55 65 81) 0deg 360deg)",
                      }}
                    >
                      <div className="absolute inset-[24%] rounded-full border border-white/10 bg-[var(--background)]" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {dashboard.readingSlices.map((slice) => (
                        <Link
                          key={slice.key}
                          href={readingStatusHref(slice)}
                          className="flex gap-2 rounded-lg py-0.5 pr-1 text-left transition hover:bg-white/5"
                        >
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: slice.color }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="text-xs leading-snug text-foreground/90" style={serif}>
                              {slice.label}
                            </div>
                            <div className="text-[11px] font-medium tabular-nums text-foreground/55">
                              {slice.count} book{slice.count === 1 ? "" : "s"} ·{" "}
                              {Math.round(slice.percentage)}%
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="mb-6">
            <SectionLabel>Top authors</SectionLabel>
            {dashboard.topAuthors.length === 0 ? (
              <p className="mt-3 text-sm italic text-foreground/55" style={serif}>
                Your author ranks will appear as your collection grows.
              </p>
            ) : (
              <>
                <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] px-1">
                  {authorsShown.map((a, index) => (
                    <li key={a.name}>
                      <Link
                        href="/dashboard/authors"
                        className="flex items-baseline gap-3 px-3 py-2.5 transition hover:bg-white/[0.04]"
                      >
                        <span
                          className="w-7 shrink-0 text-[11px] font-semibold tabular-nums text-indigo-300/90"
                          style={serif}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground/90" style={serif}>
                          {a.name}
                        </span>
                        <span className="shrink-0 text-sm font-light tabular-nums text-foreground/50" style={serif}>
                          {a.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {dashboard.topAuthors.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAuthorsExpanded((v) => !v)}
                    className="mt-2 w-full text-right text-[11px] text-foreground/45 transition hover:text-foreground/70"
                  >
                    {showAuthorsExpanded ? "Show top 3 ↑" : "Show top 10 ↓"}
                  </button>
                ) : null}
              </>
            )}
          </section>

          <section className="mb-6 space-y-5">
            <div>
              <SectionLabel>Main categories</SectionLabel>
              {dashboard.categoryMainStats.length === 0 ? (
                <p className="mt-3 text-sm italic text-foreground/55" style={serif}>
                  Category catalog is still syncing.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {dashboard.categoryMainStats.map((row) => (
                    <Link
                      key={row.id}
                      href={categoryStatHref(row)}
                      className="flex min-h-[52px] min-w-[104px] flex-1 flex-col items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.05] px-2.5 py-2 text-center transition hover:border-indigo-400/25 hover:bg-white/[0.07] sm:flex-none"
                    >
                      <span
                        className="line-clamp-2 text-center text-xs leading-snug text-foreground/90"
                        style={serif}
                      >
                        {row.title}
                      </span>
                      <span className="mt-0.5 text-[13px] font-light tabular-nums text-foreground/50" style={serif}>
                        {row.count}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <SectionLabel>Form</SectionLabel>
                {dashboard.categoryFormStats.length === 0 ? (
                  <p className="mt-3 text-sm italic text-foreground/55" style={serif}>
                    No form breakdown yet.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
                    {dashboard.categoryFormStats.slice(0, 8).map((row) => (
                      <li key={row.id}>
                        <Link
                          href={categoryStatHref(row)}
                          className="flex items-center gap-2 px-3 py-2 transition hover:bg-white/[0.04]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] text-foreground/90" style={serif}>
                              {row.title}
                            </div>
                            {row.detail ? (
                              <div className="truncate text-[10px] text-foreground/40">{row.detail}</div>
                            ) : null}
                          </div>
                          <span className="text-sm font-light tabular-nums text-foreground/50" style={serif}>
                            {row.count}
                          </span>
                          <span className="text-[9px] text-indigo-300/70">↗</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <SectionLabel>Genre</SectionLabel>
                {dashboard.categoryGenreStats.length === 0 ? (
                  <p className="mt-3 text-sm italic text-foreground/55" style={serif}>
                    No genre breakdown yet.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
                    {dashboard.categoryGenreStats.slice(0, 8).map((row) => (
                      <li key={row.id}>
                        <Link
                          href={categoryStatHref(row)}
                          className="flex items-center gap-2 px-3 py-2 transition hover:bg-white/[0.04]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] text-foreground/90" style={serif}>
                              {row.title}
                            </div>
                            {row.detail ? (
                              <div className="truncate text-[10px] text-foreground/40">{row.detail}</div>
                            ) : null}
                          </div>
                          <span className="text-sm font-light tabular-nums text-foreground/50" style={serif}>
                            {row.count}
                          </span>
                          <span className="text-[9px] text-indigo-300/70">↗</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {dashboard.lentOutBooks.length > 0 ? (
            <section className="mb-4">
              <Link
                href="/dashboard/books?lent=1"
                className="group flex items-baseline gap-2 border-b border-transparent pb-1 transition hover:border-indigo-400/20"
              >
                <SectionLabel>Lent out</SectionLabel>
                <span className="text-[11px] font-semibold text-foreground/45">
                  ({dashboard.lentOutBooks.length})
                </span>
                <span className="ml-auto text-xs text-indigo-300/70 transition group-hover:text-indigo-200">
                  View →
                </span>
              </Link>
              <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
                {dashboard.lentOutBooks.slice(0, 5).map((book) => (
                  <li key={book.id}>
                    <Link
                      href={`/dashboard/books/${book.id}/edit`}
                      className="block px-3 py-3 transition hover:bg-white/[0.04]"
                    >
                      <div className="text-sm text-foreground/90" style={serif}>
                        {book.title || "Untitled"}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-sky-200/80">
                        <span aria-hidden>↪</span>
                        {(book.lentTo || "").toString().trim() || "Borrower not set"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
