"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
} from "@/lib/categoriesApi";

export default function CategoriesPage() {
  const { user, loading } = useAuth();

  const [categories, setCategories] = useState([]);
  const [bookCounts, setBookCounts] = useState({});
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");

  const readingEmpty = useMemo(() => categories.length === 0, [categories.length]);

  const load = async () => {
    if (!user) return;
    setError("");
    setBusy(true);
    try {
      const [cats, booksSnap] = await Promise.all([
        listCategories(user.uid),
        getDocs(collection(db, "users", user.uid, "books")),
      ]);

      const counts = {};
      for (const b of booksSnap.docs) {
        const data = b.data();
        const cid = data.categoryId || "";
        if (!cid) continue;
        counts[cid] = (counts[cid] || 0) + 1;
      }

      setCategories(cats);
      setBookCounts(counts);
    } catch (err) {
      setError(err?.message || "Failed to load categories.");
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

  const onCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createCategory(user.uid, name);
      setName("");
      await load();
    } catch (err) {
      setError(err?.message || "Unable to create category.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditingName(c.name || "");
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditingName("");
  };

  const saveEdit = async (id) => {
    if (!editingName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await renameCategory(user.uid, id, editingName);
      cancelEdit();
      await load();
    } catch (err) {
      setError(err?.message || "Unable to rename category.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id) => {
    const count = bookCounts[id] || 0;
    if (count > 0) {
      setError("This category is used by books. Reassign them first.");
      return;
    }
    const ok = window.confirm("Delete this category?");
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await deleteCategory(user.uid, id);
      await load();
    } catch (err) {
      setError(err?.message || "Unable to delete category.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <div className="text-sm text-foreground/70">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-foreground/85">Categories</div>
          <div className="mt-1 text-sm text-foreground/60">
            Kitaplarınızda asıl hiyerarşi: <span className="font-medium">Ana kategori → Form → Tür</span>{" "}
            (Fiction / Non-fiction / Other; iOS ile aynı ağaç). Aşağıdaki düz liste isteğe bağlı ek etiketler içindir.
          </div>
        </div>

        <form onSubmit={onCreate} className="flex w-full gap-3 sm:w-auto">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category (e.g. Poetry)"
            className="w-full min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add
          </button>
        </form>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {readingEmpty ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="text-sm text-foreground/70">No categories yet.</div>
          <div className="mt-2 text-sm text-foreground/60">
            Add your first category above.
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        {categories
          .slice()
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map((c) => {
            const count = bookCounts[c.id] || 0;
            const isEditing = editingId === c.id;

            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-4"
              >
                <div className="min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                    />
                  ) : (
                    <div className="truncate text-sm font-semibold text-foreground/90">
                      {c.name}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-foreground/60">
                    {count} book(s) in this category
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveEdit(c.id)}
                      className="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={cancelEdit}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground/85 hover:bg-white/10 hover:border-white/15 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startEdit(c)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground/85 hover:bg-white/10 hover:border-white/15 transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy || count > 0}
                      onClick={() => onDelete(c.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-rose-200/90 hover:bg-rose-500/15 hover:border-rose-500/25 transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

