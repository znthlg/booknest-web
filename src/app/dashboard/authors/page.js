"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

function normalizeText(s) {
  return (s || "").toString().toLowerCase();
}

export default function AuthorsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    if (!user) return;
    setError("");
    try {
      const snap = await getDocs(collection(db, "users", user.uid, "books"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBooks(list);
    } catch (err) {
      setError(err?.message || "Failed to load books.");
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.uid]);

  const authors = useMemo(() => {
    const counts = new Map();
    for (const b of books) {
      const arr = Array.isArray(b.authors)
        ? b.authors
        : b.author
          ? [b.author]
          : [];
      for (const a of arr) {
        const name = (a || "").toString().trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [books]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return authors;
    return authors.filter((a) => normalizeText(a.name).includes(q));
  }, [authors, query]);

  if (loading) {
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

      <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-base font-semibold tracking-tight">Authors</div>
        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search by name"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-400/50"
          />
        </div>
      </div>

      <div className="grid gap-2">
        {filtered.length ? (
          filtered.map((a) => (
            <button
              key={a.name}
              type="button"
              onClick={() => {
                // For now we route to Library and let search handle it.
                router.push(`/dashboard/books?author=${encodeURIComponent(a.name)}`);
              }}
              className="group flex w-full items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:bg-white/8 hover:border-white/15"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground/90">{a.name}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-foreground/60">{a.count} books</div>
                <div className="h-8 w-8 rounded-2xl border border-white/10 bg-white/5 text-sm text-foreground/70 flex items-center justify-center">
                  &gt;
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-foreground/60">
            No authors found.
          </div>
        )}
      </div>
    </div>
  );
}

