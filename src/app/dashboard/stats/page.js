"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

function getCreatedAtMillis(createdAt) {
  if (!createdAt) return 0;
  if (typeof createdAt.toMillis === "function") return createdAt.toMillis();
  if (typeof createdAt.seconds === "number") return createdAt.seconds * 1000;
  if (typeof createdAt.toDate === "function") return createdAt.toDate().getTime();
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export default function StatsPage() {
  const { user, loading } = useAuth();

  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    setError("");
    setBusy(true);
    try {
      const [booksSnap, catsSnap] = await Promise.all([
        getDocs(collection(db, "users", user.uid, "books")),
        getDocs(collection(db, "users", user.uid, "categories")),
      ]);

      const b = booksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      b.sort((a, b2) => getCreatedAtMillis(b2.createdAt) - getCreatedAtMillis(a.createdAt));
      setBooks(b);
      setCategories(catsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setError(err?.message || "Failed to load stats.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.uid]);

  const stats = useMemo(() => {
    const totalBooks = books.length;

    const authorCounts = new Map();
    const addAuthors = (book) => {
      const authors = Array.isArray(book.authors)
        ? book.authors.filter(Boolean)
        : book.author
          ? [book.author]
          : [];
      for (const a of authors) {
        const key = a.trim();
        if (!key) continue;
        authorCounts.set(key, (authorCounts.get(key) || 0) + 1);
      }
    };

    const finishedBooks = books.filter((b) =>
      (b.readingStatus || "").toString().toLowerCase().includes("finish")
    );

    const source = finishedBooks.length ? finishedBooks : books;
    for (const b of source) addAuthors(b);

    const mostReadAuthor = Array.from(authorCounts.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)[0] || null;

    const authorsRank = Array.from(authorCounts.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count);

    const categoryCounts = new Map();
    for (const b of books) {
      const hasId = !!b.categoryId;
      const key = hasId ? b.categoryId : `name:${b.category || "Uncategorized"}`;
      categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
    }

    const categoryRows = Array.from(categoryCounts.entries()).map(([key, count]) => {
      const isNameKey = key.startsWith("name:");
      const id = isNameKey ? "" : key;
      const name = isNameKey
        ? key.slice("name:".length)
        : categories.find((c) => c.id === key)?.name || "Uncategorized";
      const pct = totalBooks ? Math.round((count / totalBooks) * 100) : 0;
      return { id, name, count, pct };
    });

    categoryRows.sort((a, b) => b.count - a.count);

    return { totalBooks, mostReadAuthor, authorsRank, categoryRows };
  }, [books, categories]);

  if (loading || busy) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <div className="text-sm text-foreground/70">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <div className="mb-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-medium text-foreground/85">Total Books</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{stats.totalBooks}</div>
          <div className="mt-2 text-sm text-foreground/60">All books in your physical collection.</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-medium text-foreground/85">Most Read Author</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {stats.mostReadAuthor ? stats.mostReadAuthor.author : "—"}
          </div>
          <div className="mt-1 text-sm text-foreground/60">
            {stats.mostReadAuthor ? `${stats.mostReadAuthor.count} book(s)` : "Finish a book to populate this."}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-medium text-foreground/85">Category Distribution</div>
        <div className="mt-3 grid gap-2">
          {stats.categoryRows.length ? (
            stats.categoryRows.slice(0, 8).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground/90">
                    {row.name}
                  </div>
                  <div className="text-xs text-foreground/60">{row.count} book(s)</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground/85">{row.pct}%</div>
                  <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-indigo-400/60"
                      style={{ width: `${Math.min(100, row.pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-foreground/60">No category data yet.</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-medium text-foreground/85">Books per Author</div>
        <div className="mt-3 grid gap-2">
          {stats.authorsRank.length ? (
            stats.authorsRank.slice(0, 10).map((row) => (
              <div key={row.author} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground/90">
                    {row.author}
                  </div>
                </div>
                <div className="text-sm font-semibold text-foreground/85">
                  {row.count}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-foreground/60">No author data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

