import {
  DEFAULT_SHELF_SLOT_LABELS,
  PLACEMENT_BOOKSHELF_PAIRS,
  PLACEMENT_ROOM_PAIRS,
} from "./placementPresets";

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

/**
 * Same nesting as iOS `PlacementSettings.makeDefault()` (keys + default shelf rows).
 * Includes `name` on each node for web display (Swift also encodes `name` on save).
 */
export function buildDefaultPlacementSettings() {
  const rooms = PLACEMENT_ROOM_PAIRS.map(([roomKey, en]) => ({
    id: newId(),
    roomKey,
    roomCustom: null,
    name: en,
    bookshelves: PLACEMENT_BOOKSHELF_PAIRS.map(([bookshelfKey, ben]) => ({
      id: newId(),
      bookshelfKey,
      bookshelfCustom: null,
      name: ben,
      shelves: DEFAULT_SHELF_SLOT_LABELS.map((label) => ({
        id: newId(),
        shelfKey: null,
        shelfCustom: label,
        name: label,
      })),
    })),
  }));

  return { rooms };
}
