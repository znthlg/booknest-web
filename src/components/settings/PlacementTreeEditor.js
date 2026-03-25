"use client";

import { useEffect, useState } from "react";
import { newTaxonomyId } from "@/lib/taxonomyIds";
import { savePlacementTree } from "@/lib/placementSettingsWrites";

function cloneRooms(rooms) {
  if (!rooms?.length) return [];
  return JSON.parse(JSON.stringify(rooms));
}

function emptyRoom() {
  const name = "New room";
  return {
    id: newTaxonomyId(),
    roomKey: null,
    roomCustom: name,
    name,
    bookshelves: [],
  };
}

function emptyBookshelf() {
  const name = "New bookshelf";
  return {
    id: newTaxonomyId(),
    bookshelfKey: null,
    bookshelfCustom: name,
    name,
    shelves: [],
  };
}

function emptyShelf() {
  const name = "Shelf 1";
  return {
    id: newTaxonomyId(),
    shelfKey: null,
    shelfCustom: name,
    name,
  };
}

export default function PlacementTreeEditor({ userId, initialRooms, onSaved }) {
  const [rooms, setRooms] = useState([]);
  const [roomIdx, setRoomIdx] = useState(-1);
  const [bookshelfIdx, setBookshelfIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const next = cloneRooms(initialRooms);
    setRooms(next);
    if (!next.length) {
      setRoomIdx(-1);
      setBookshelfIdx(-1);
      return;
    }
    setRoomIdx((ri) => (ri >= 0 && ri < next.length ? ri : -1));
  }, [initialRooms]);

  useEffect(() => {
    if (roomIdx < 0 || roomIdx >= rooms.length) {
      setBookshelfIdx(-1);
      return;
    }
    setBookshelfIdx((bi) => {
      const bs = rooms[roomIdx]?.bookshelves || [];
      if (!bs.length) return -1;
      if (bi < 0) return -1;
      return Math.min(bi, bs.length - 1);
    });
  }, [rooms, roomIdx]);

  const room = roomIdx >= 0 ? rooms[roomIdx] : null;
  const bookshelves = room?.bookshelves || [];
  const bookshelf = bookshelfIdx >= 0 ? bookshelves[bookshelfIdx] : null;
  const shelves = bookshelf?.shelves || [];

  const openRoom = (i) => {
    setRoomIdx(i);
    setBookshelfIdx(-1);
  };

  const backToRooms = () => {
    setRoomIdx(-1);
    setBookshelfIdx(-1);
  };

  const openBookshelf = (bi) => {
    setBookshelfIdx(bi);
  };

  const backToBookshelves = () => {
    setBookshelfIdx(-1);
  };

  const setRoomName = (ri, name) => {
    const v = name || "";
    setRooms((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[ri].name = v;
      next[ri].roomCustom = v;
      return next;
    });
  };

  const setBookshelfName = (ri, bi, name) => {
    const v = name || "";
    setRooms((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[ri].bookshelves[bi].name = v;
      next[ri].bookshelves[bi].bookshelfCustom = v;
      return next;
    });
  };

  const setShelfName = (ri, bi, si, name) => {
    const v = name || "";
    setRooms((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[ri].bookshelves[bi].shelves[si].name = v;
      next[ri].bookshelves[bi].shelves[si].shelfCustom = v;
      return next;
    });
  };

  const addRoom = () => {
    setRooms((prev) => [...prev, emptyRoom()]);
    setRoomIdx(-1);
    setBookshelfIdx(-1);
  };

  const removeRoom = (ri) => {
    if (!window.confirm("Remove this room and all bookshelves/shelves inside?")) return;
    const next = rooms.filter((_, i) => i !== ri);
    setRooms(next);
    if (roomIdx === ri) {
      setRoomIdx(-1);
      setBookshelfIdx(-1);
    } else if (ri < roomIdx) {
      setRoomIdx(roomIdx - 1);
    }
    if (!next.length) {
      setRoomIdx(-1);
      setBookshelfIdx(-1);
    }
  };

  const addBookshelf = (ri) => {
    const newIdx = (rooms[ri]?.bookshelves || []).length;
    setRooms((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      n[ri].bookshelves = [...(n[ri].bookshelves || []), emptyBookshelf()];
      return n;
    });
    if (ri === roomIdx) setBookshelfIdx(newIdx);
  };

  const removeBookshelf = (ri, bi) => {
    if (ri !== roomIdx) {
      setRooms((prev) => {
        const n = JSON.parse(JSON.stringify(prev));
        n[ri].bookshelves = n[ri].bookshelves.filter((_, j) => j !== bi);
        return n;
      });
      return;
    }
    const next = JSON.parse(JSON.stringify(rooms));
    next[ri].bookshelves = next[ri].bookshelves.filter((_, j) => j !== bi);
    setRooms(next);
    const bl = next[ri].bookshelves.length;
    let nb = bookshelfIdx;
    if (!bl) nb = -1;
    else if (bi < bookshelfIdx) nb = bookshelfIdx - 1;
    else if (bi === bookshelfIdx) nb = -1;
    setBookshelfIdx(nb);
  };

  const addShelf = (ri, bi) => {
    setRooms((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      n[ri].bookshelves[bi].shelves = [...(n[ri].bookshelves[bi].shelves || []), emptyShelf()];
      return n;
    });
  };

  const removeShelf = (ri, bi, si) => {
    setRooms((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      n[ri].bookshelves[bi].shelves = n[ri].bookshelves[bi].shelves.filter((_, j) => j !== si);
      return n;
    });
  };

  const onSave = async () => {
    if (!userId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await savePlacementTree(userId, rooms);
      setMessage("Placement saved.");
      await onSaved?.();
    } catch (e) {
      setError(e?.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Rooms */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-foreground/80">Rooms</div>
            <div className="mt-0.5 text-[11px] text-foreground/45">
              Edit names here. Open a room to manage bookshelves and shelves.
            </div>
          </div>
          <button
            type="button"
            onClick={addRoom}
            className="shrink-0 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-500/15"
          >
            + New room
          </button>
        </div>

        {!rooms.length ? (
          <p className="rounded-xl border border-white/10 bg-white/5 py-8 text-center text-sm text-foreground/50">
            No rooms yet. Add one or reload after defaults are seeded.
          </p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((r, i) => (
              <li
                key={r.id}
                className={`rounded-xl border px-3 py-2 transition ${
                  roomIdx === i
                    ? "border-indigo-400/35 bg-indigo-500/[0.08]"
                    : "border-white/10 bg-white/[0.04] hover:border-white/15"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={r.name || ""}
                    onChange={(e) => setRoomName(i, e.target.value)}
                    className="min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
                    placeholder="Room name"
                  />
                  <span className="text-[11px] tabular-nums text-foreground/40">
                    {(r.bookshelves || []).length} bookshelves
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRoom(i)}
                    className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => openRoom(i)}
                    className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15"
                  >
                    Bookshelves →
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bookshelves */}
      {roomIdx >= 0 && room ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={backToRooms}
            className="mb-3 text-xs font-medium text-indigo-300/90 hover:text-indigo-200"
          >
            ← Rooms
          </button>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-foreground/80">Bookshelves</div>
              <div className="text-[11px] text-foreground/45">In “{room.name || "…"}”</div>
            </div>
            <button
              type="button"
              onClick={() => addBookshelf(roomIdx)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
            >
              + New bookshelf
            </button>
          </div>

          {!bookshelves.length ? (
            <p className="text-sm text-foreground/45">No bookshelves yet.</p>
          ) : (
            <ul className="space-y-2">
              {bookshelves.map((b, bi) => (
                <li
                  key={b.id}
                  className={`rounded-xl border px-3 py-2 transition ${
                    bookshelfIdx === bi
                      ? "border-indigo-400/35 bg-indigo-500/[0.08]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/15"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={b.name || ""}
                      onChange={(e) => setBookshelfName(roomIdx, bi, e.target.value)}
                      className="min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
                      placeholder="Bookshelf name"
                    />
                    <span className="text-[11px] text-foreground/40">
                      {(b.shelves || []).length} shelves
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBookshelf(roomIdx, bi)}
                      className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => openBookshelf(bi)}
                      className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15"
                    >
                      Shelves →
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* Shelves */}
      {roomIdx >= 0 && bookshelfIdx >= 0 && bookshelf ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={backToBookshelves}
            className="mb-3 text-xs font-medium text-indigo-300/90 hover:text-indigo-200"
          >
            ← Bookshelves in “{room.name || "…"}”
          </button>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-foreground/80">Shelves</div>
              <div className="text-[11px] text-foreground/45">On “{bookshelf.name || "…"}”</div>
            </div>
            <button
              type="button"
              onClick={() => addShelf(roomIdx, bookshelfIdx)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
            >
              + Shelf
            </button>
          </div>
          {!shelves.length ? (
            <p className="text-sm text-foreground/45">No shelves yet.</p>
          ) : (
            <ul className="space-y-2">
              {shelves.map((sh, si) => (
                <li
                  key={sh.id}
                  className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2"
                >
                  <input
                    value={sh.name || ""}
                    onChange={(e) => setShelfName(roomIdx, bookshelfIdx, si, e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    placeholder="Shelf label"
                  />
                  <button
                    type="button"
                    onClick={() => removeShelf(roomIdx, bookshelfIdx, si)}
                    className="px-2 text-foreground/45 hover:text-rose-300"
                    aria-label="Remove shelf"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300/90">{message}</p> : null}

      <button
        type="button"
        disabled={busy || !userId}
        onClick={onSave}
        className="w-full rounded-2xl bg-indigo-500 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save placement"}
      </button>
    </div>
  );
}
