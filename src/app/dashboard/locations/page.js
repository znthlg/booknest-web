"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  createLocation,
  deleteLocation,
  listLocations,
  renameLocation,
} from "@/lib/locationsApi";

export default function LocationsPage() {
  const { user, loading } = useAuth();

  const [locations, setLocations] = useState([]);
  const [bookCounts, setBookCounts] = useState({});
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");

  const empty = useMemo(() => locations.length === 0, [locations.length]);

  const load = async () => {
    if (!user) return;
    setError("");
    setBusy(true);
    try {
      const [locs, booksSnap] = await Promise.all([
        listLocations(user.uid),
        getDocs(collection(db, "users", user.uid, "books")),
      ]);

      const counts = {};
      for (const b of booksSnap.docs) {
        const data = b.data();
        const lid = data.locationId || "";
        if (!lid) continue;
        counts[lid] = (counts[lid] || 0) + 1;
      }

      setLocations(locs);
      setBookCounts(counts);
    } catch (err) {
      setError(err?.message || "Failed to load locations.");
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
      await createLocation(user.uid, name);
      setName("");
      await load();
    } catch (err) {
      setError(err?.message || "Unable to create location.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (l) => {
    setEditingId(l.id);
    setEditingName(l.name || "");
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
      await renameLocation(user.uid, id, editingName);
      cancelEdit();
      await load();
    } catch (err) {
      setError(err?.message || "Unable to rename location.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id) => {
    const count = bookCounts[id] || 0;
    if (count > 0) {
      setError("This location is used by books. Reassign them first.");
      return;
    }
    const ok = window.confirm("Delete this location?");
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await deleteLocation(user.uid, id);
      await load();
    } catch (err) {
      setError(err?.message || "Unable to delete location.");
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
          <div className="text-sm font-medium text-foreground/85">Locations</div>
          <div className="mt-1 text-sm text-foreground/60">
            Define where your books live.
          </div>
        </div>

        <form onSubmit={onCreate} className="flex w-full gap-3 sm:w-auto">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New location (e.g. Office / Shelf A)"
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

      {empty ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="text-sm text-foreground/70">No locations yet.</div>
        </div>
      ) : null}

      <div className="grid gap-3">
        {locations
          .slice()
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map((l) => {
            const count = bookCounts[l.id] || 0;
            const isEditing = editingId === l.id;
            return (
              <div
                key={l.id}
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
                      {l.name}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-foreground/60">
                    {count} book(s) in this location
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveEdit(l.id)}
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
                      onClick={() => startEdit(l)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground/85 hover:bg-white/10 hover:border-white/15 transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy || count > 0}
                      onClick={() => onDelete(l.id)}
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

