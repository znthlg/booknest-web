import { presetCategoryMainLabel } from "@/lib/bookCategory";
import { PLACEMENT_BOOKSHELF_KEY_TO_EN, PLACEMENT_ROOM_KEY_TO_EN } from "./placementCatalog/placementPresets";

function trim(s) {
  if (s == null) return "";
  return String(s).trim();
}

/** Light touch: capitalize words for custom labels (Swift uses richer casing). */
export function formatCatalogLabel(custom) {
  const t = trim(custom);
  if (!t) return "";
  return t
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function labelPlacementRoom(node) {
  if (!node) return "";
  const c = trim(node.roomCustom);
  if (c) return formatCatalogLabel(c);
  const k = trim(node.roomKey);
  if (k && PLACEMENT_ROOM_KEY_TO_EN[k]) return PLACEMENT_ROOM_KEY_TO_EN[k];
  return trim(node.name) || "Unknown";
}

export function labelPlacementBookshelf(node) {
  if (!node) return "";
  const c = trim(node.bookshelfCustom);
  if (c) return formatCatalogLabel(c);
  const k = trim(node.bookshelfKey);
  if (k && PLACEMENT_BOOKSHELF_KEY_TO_EN[k]) return PLACEMENT_BOOKSHELF_KEY_TO_EN[k];
  return trim(node.name) || "Default Shelf";
}

export function labelPlacementShelf(node) {
  if (!node) return "";
  const c = trim(node.shelfCustom);
  if (c) return formatCatalogLabel(c);
  const k = trim(node.shelfKey);
  if (k && PLACEMENT_BOOKSHELF_KEY_TO_EN[k]) return PLACEMENT_BOOKSHELF_KEY_TO_EN[k];
  return trim(node.name) || "1";
}

/**
 * Flat ID → display maps for `getPlacementDisplay` / mobile parity.
 */
export function placementTreeToLookupMaps(rooms) {
  /** @type {Record<string, string>} */
  const physicalRooms = {};
  /** @type {Record<string, string>} */
  const physicalBookshelves = {};
  /** @type {Record<string, string>} */
  const physicalShelves = {};

  for (const room of rooms || []) {
    if (room?.id) physicalRooms[room.id] = labelPlacementRoom(room);
    for (const bs of room.bookshelves || []) {
      if (bs?.id) physicalBookshelves[bs.id] = labelPlacementBookshelf(bs);
      for (const sh of bs.shelves || []) {
        if (sh?.id) physicalShelves[sh.id] = labelPlacementShelf(sh);
      }
    }
  }

  return { physicalRooms, physicalBookshelves, physicalShelves };
}

function mainDisplayName(m) {
  const n = trim(m?.name);
  if (n) return n;
  const c = trim(m?.categoryCustom);
  if (c) return formatCatalogLabel(c);
  return presetCategoryMainLabel(m?.id) || "";
}

function formDisplayName(f) {
  const n = trim(f?.name);
  if (n) return n;
  const c = trim(f?.categoryCustom);
  if (c) return formatCatalogLabel(c);
  return "";
}

function genreDisplayName(g) {
  const n = trim(g?.name);
  if (n) return n;
  const c = trim(g?.categoryCustom);
  if (c) return formatCatalogLabel(c);
  return "";
}

/**
 * Flat ID maps from `categoryTree.mainCategories` (iOS `CategorySettings` JSON).
 */
export function categoryTreeToLookupMaps(mainCategories) {
  /** @type {Record<string, string>} */
  const categoryMains = {};
  /** @type {Record<string, string>} */
  const categoryForms = {};
  /** @type {Record<string, string>} */
  const categoryGenres = {};

  for (const m of mainCategories || []) {
    if (!m?.id) continue;
    const md = mainDisplayName(m);
    if (md) categoryMains[m.id] = md;
    for (const f of m.forms || []) {
      if (!f?.id) continue;
      const fd = formDisplayName(f);
      if (fd) categoryForms[f.id] = fd;
      for (const g of f.genres || []) {
        if (!g?.id) continue;
        const gd = genreDisplayName(g);
        if (gd) categoryGenres[g.id] = gd;
      }
    }
  }

  return { categoryMains, categoryForms, categoryGenres };
}
