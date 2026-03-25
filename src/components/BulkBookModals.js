"use client";

import { useEffect, useState } from "react";
import {
  bulkDeleteBooks,
  bulkUpdateCategory,
  bulkUpdatePlacement,
  bulkUpdateReadingStatus,
} from "@/lib/booksBulkApi";
import { buildBulkCategoryPayload, buildBulkPlacementPayload } from "@/lib/bulkBookPayloads";
import {
  labelPlacementBookshelf,
  labelPlacementRoom,
  labelPlacementShelf,
} from "@/lib/taxonomyTreeMaps";

const READING_OPTIONS = ["To Read", "Reading", "Finished", "On hold", "Abandoned"];

function ModalChrome({ title, children, onClose, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[var(--background)] p-5 shadow-xl">
        <div className="mb-4 text-sm font-semibold text-foreground/90">{title}</div>
        {children}
        {footer}
      </div>
    </div>
  );
}

export default function BulkBookModals({
  userId,
  selectedIds,
  categorySettings,
  placementSettings,
  active,
  onClose,
  onCompleted,
}) {
  const [readingStatus, setReadingStatus] = useState("To Read");
  const [mainId, setMainId] = useState("");
  const [formId, setFormId] = useState("");
  const [genreId, setGenreId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [bookshelfId, setBookshelfId] = useState("");
  const [shelfId, setShelfId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mains = categorySettings?.mainCategories ?? [];
  const rooms = placementSettings?.rooms ?? [];
  const selectedMain = mains.find((m) => m.id === mainId);
  const forms = selectedMain?.forms ?? [];
  const selectedForm = forms.find((f) => f.id === formId);
  const genres = selectedForm?.genres ?? [];
  const selectedRoom = rooms.find((r) => r.id === roomId);
  const bookshelves = selectedRoom?.bookshelves ?? [];
  const selectedBookshelf = bookshelves.find((b) => b.id === bookshelfId);
  const shelves = selectedBookshelf?.shelves ?? [];

  useEffect(() => {
    if (!active) return;
    setError("");
    if (active === "status") setReadingStatus("To Read");
    if (active === "category") {
      setMainId("");
      setFormId("");
      setGenreId("");
    }
    if (active === "placement") {
      setRoomId("");
      setBookshelfId("");
      setShelfId("");
    }
  }, [active]);

  useEffect(() => {
    setFormId("");
    setGenreId("");
  }, [mainId]);

  useEffect(() => {
    setGenreId("");
  }, [formId]);

  useEffect(() => {
    setBookshelfId("");
    setShelfId("");
  }, [roomId]);

  useEffect(() => {
    setShelfId("");
  }, [bookshelfId]);

  if (!active || !userId || !selectedIds.length) return null;

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await onCompleted?.();
      onClose();
    } catch (e) {
      setError(e?.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  if (active === "status") {
    return (
      <ModalChrome
        title="Bulk reading status"
        onClose={onClose}
        footer={
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const n = selectedIds.length;
                if (!window.confirm(`Set reading status to “${readingStatus}” for ${n} book(s)?`)) return;
                run(() => bulkUpdateReadingStatus(userId, selectedIds, readingStatus));
              }}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {busy ? "Applying…" : "Apply"}
            </button>
          </div>
        }
      >
        <label className="mb-1 block text-xs text-foreground/60">Status</label>
        <select
          value={readingStatus}
          onChange={(e) => setReadingStatus(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
        >
          {READING_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      </ModalChrome>
    );
  }

  if (active === "category") {
    return (
      <ModalChrome
        title="Bulk category"
        onClose={onClose}
        footer={
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !mainId || !formId}
              onClick={() => {
                const n = selectedIds.length;
                if (!window.confirm(`Update category for ${n} book(s)?`)) return;
                const payload = buildBulkCategoryPayload(categorySettings, mainId, formId, genreId);
                run(() => bulkUpdateCategory(userId, selectedIds, payload));
              }}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {busy ? "Applying…" : "Apply"}
            </button>
          </div>
        }
      >
        {!mains.length ? (
          <p className="text-sm text-amber-200/90">Category catalog not loaded.</p>
        ) : (
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Main</label>
              <select
                value={mainId}
                onChange={(e) => setMainId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {mains.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Form</label>
              <select
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={!mainId}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Genre (optional)</label>
              <select
                value={genreId}
                onChange={(e) => setGenreId(e.target.value)}
                disabled={!formId || !genres.length}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">—</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      </ModalChrome>
    );
  }

  if (active === "placement") {
    return (
      <ModalChrome
        title="Bulk placement"
        onClose={onClose}
        footer={
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !roomId || !bookshelfId || !shelfId}
              onClick={() => {
                const n = selectedIds.length;
                if (!window.confirm(`Update shelf placement for ${n} book(s)?`)) return;
                const payload = buildBulkPlacementPayload(
                  placementSettings,
                  roomId,
                  bookshelfId,
                  shelfId
                );
                run(() => bulkUpdatePlacement(userId, selectedIds, payload));
              }}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {busy ? "Applying…" : "Apply"}
            </button>
          </div>
        }
      >
        {!rooms.length ? (
          <p className="text-sm text-amber-200/90">Placement tree not loaded. Open dashboard once to sync.</p>
        ) : (
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Room</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {labelPlacementRoom(r)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Bookshelf</label>
              <select
                value={bookshelfId}
                onChange={(e) => setBookshelfId(e.target.value)}
                disabled={!roomId}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {bookshelves.map((b) => (
                  <option key={b.id} value={b.id}>
                    {labelPlacementBookshelf(b)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">Shelf</label>
              <select
                value={shelfId}
                onChange={(e) => setShelfId(e.target.value)}
                disabled={!bookshelfId}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {shelves.map((s) => (
                  <option key={s.id} value={s.id}>
                    {labelPlacementShelf(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      </ModalChrome>
    );
  }

  if (active === "delete") {
    return (
      <ModalChrome
        title="Delete books"
        onClose={onClose}
        footer={
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const n = selectedIds.length;
                if (!window.confirm(`Permanently delete ${n} book(s)? This cannot be undone.`)) return;
                run(() => bulkDeleteBooks(userId, selectedIds));
              }}
              className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs font-medium text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-foreground/70">
          You are about to delete <strong>{selectedIds.length}</strong> book(s).
        </p>
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      </ModalChrome>
    );
  }

  return null;
}
