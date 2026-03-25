const STORAGE_PREFIX = "booknest:lastPlacement:";

/**
 * @param {string} userId
 * @returns {{ physicalRoomId: string, physicalBookshelfId: string, physicalShelfId: string } | null}
 */
export function readLastPlacementPreference(userId) {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    return {
      physicalRoomId: String(o.physicalRoomId || ""),
      physicalBookshelfId: String(o.physicalBookshelfId || ""),
      physicalShelfId: String(o.physicalShelfId || ""),
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} userId
 * @param {{ physicalRoomId?: string, physicalBookshelfId?: string, physicalShelfId?: string }} ids
 */
export function writeLastPlacementPreference(userId, ids) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + userId,
      JSON.stringify({
        physicalRoomId: ids.physicalRoomId || "",
        physicalBookshelfId: ids.physicalBookshelfId || "",
        physicalShelfId: ids.physicalShelfId || "",
      })
    );
  } catch {
    /* quota / private mode */
  }
}

/**
 * Keeps only IDs that still exist in the current placement tree.
 * @param {object[]|undefined} rooms placementSettings.rooms
 * @param {{ physicalRoomId?: string, physicalBookshelfId?: string, physicalShelfId?: string }} stored
 */
export function resolveLastPlacementInTree(rooms, stored) {
  const list = rooms ?? [];
  const r = (stored?.physicalRoomId || "").trim();
  const b = (stored?.physicalBookshelfId || "").trim();
  const s = (stored?.physicalShelfId || "").trim();
  if (!r || !b || !s) {
    return { physicalRoomId: "", physicalBookshelfId: "", physicalShelfId: "" };
  }
  const room = list.find((x) => x.id === r);
  if (!room) return { physicalRoomId: "", physicalBookshelfId: "", physicalShelfId: "" };
  const bookshelf = (room.bookshelves || []).find((x) => x.id === b);
  if (!bookshelf) {
    return { physicalRoomId: r, physicalBookshelfId: "", physicalShelfId: "" };
  }
  const shelf = (bookshelf.shelves || []).find((x) => x.id === s);
  if (!shelf) {
    return { physicalRoomId: r, physicalBookshelfId: b, physicalShelfId: "" };
  }
  return { physicalRoomId: r, physicalBookshelfId: b, physicalShelfId: s };
}
