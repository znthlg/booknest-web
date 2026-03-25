/**
 * Placement / location display compatible with mobile (structured fields)
 * and web (compound `location` string).
 * Separator for splitting compound strings: - / | > ·
 */

const SEP = /\s*[-/|>·]\s*/;

export function splitPlacementString(s) {
  const raw = (s || "").toString().trim();
  if (!raw) return [];
  return raw.split(SEP).map((p) => p.trim()).filter(Boolean);
}

function isFirestoreGeoPoint(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number"
  );
}

function placementFromNestedLocation(loc) {
  if (!loc || typeof loc !== "object" || Array.isArray(loc) || isFirestoreGeoPoint(loc)) {
    return "";
  }

  const room = firstNonEmpty(
    loc.room,
    loc.roomName,
    loc.room_name,
    loc.space,
    loc.area
  );
  const unit = firstNonEmpty(
    loc.bookcase,
    loc.bookCase,
    loc.bookcaseName,
    loc.unit,
    loc.unitName,
    loc.unit_name,
    loc.bookshelf,
    loc.cabinet
  );
  const shelf = firstNonEmpty(
    loc.shelf,
    loc.shelfName,
    loc.shelf_name,
    loc.shelfRow,
    loc.row,
    loc.level,
    loc.position
  );

  const structured = [room, unit, shelf].filter(Boolean);
  if (structured.length) return structured.join(" · ");

  const single = firstNonEmpty(
    loc.name,
    loc.displayName,
    loc.fullName,
    loc.fullPath,
    loc.label,
    loc.title
  );
  if (single) {
    const parts = splitPlacementString(single);
    return parts.length ? parts.join(" · ") : single;
  }

  return "";
}

/**
 * @param {object} book
 * @param {Record<string, Record<string, string>>} [lookups] from loadMobileTaxonomyLookups
 */
export function getPlacementDisplay(book, lookups) {
  if (!book || typeof book !== "object") return "";

  if (lookups?.physicalRooms && Object.keys(lookups.physicalRooms).length) {
    const rId = firstNonEmpty(book.physicalRoomId);
    const bId = firstNonEmpty(book.physicalBookshelfId);
    const sId = firstNonEmpty(book.physicalShelfId);
    const r = rId ? lookups.physicalRooms[rId] : "";
    const u = bId && lookups.physicalBookshelves ? lookups.physicalBookshelves[bId] : "";
    const s = sId && lookups.physicalShelves ? lookups.physicalShelves[sId] : "";
    const parts = [r, u, s].map((x) => String(x || "").trim()).filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }

  const room = firstNonEmpty(
    book.room,
    book.roomName,
    book.room_name,
    book.placementRoom,
    book.locationRoom,
    book.storageRoom
  );
  const unit = firstNonEmpty(
    book.bookcase,
    book.bookCase,
    book.bookcaseName,
    book.bookshelf,
    book.shelfUnit,
    book.unit,
    book.placementUnit,
    book.bookShelf
  );
  const shelf = firstNonEmpty(
    book.shelf,
    book.shelfRow,
    book.shelfName,
    book.shelf_name,
    book.placementShelf,
    book.row,
    book.shelfPosition
  );

  const structured = [room, unit, shelf].filter(Boolean);
  if (structured.length) {
    return structured.join(" · ");
  }

  const locRaw = book.location;
  if (locRaw && typeof locRaw === "object" && !Array.isArray(locRaw) && !isFirestoreGeoPoint(locRaw)) {
    const fromObj = placementFromNestedLocation(locRaw);
    if (fromObj) return fromObj;
  }

  if (book.placement && typeof book.placement === "object") {
    const p = book.placement;
    const pr = firstNonEmpty(p.room, p.roomName, p.room_name);
    const pu = firstNonEmpty(p.bookcase, p.bookCase, p.unit, p.bookshelf);
    const ps = firstNonEmpty(p.shelf, p.shelfRow, p.row, p.shelfName);
    const nest = [pr, pu, ps].filter(Boolean);
    if (nest.length) return nest.join(" · ");
    const nestedLine = placementFromNestedLocation(p);
    if (nestedLine) return nestedLine;
  }

  const locationStringField =
    typeof book.location === "string" ? book.location : "";

  return (
    firstNonEmpty(
      locationStringField,
      book.locationName,
      book.placementLabel,
      book.physicalLocation,
      book.shelfLocation,
      book.storageLocation,
      book.locationText,
      book.locationString,
      book.locationDescription,
      book.whereabouts,
      book.konum,
      book.yer,
      book["location_name"]
    ) || ""
  );
}

export function getPlacementRoom(book, lookups) {
  const parts = splitPlacementString(getPlacementDisplay(book, lookups));
  return parts[0] || "";
}

/** Everything after room (e.g. "Main Shelf · Shelf A" for grouping). */
export function getPlacementRest(book, lookups) {
  const parts = splitPlacementString(getPlacementDisplay(book, lookups));
  if (parts.length <= 1) return "Main Shelf";
  return parts.slice(1).join(" · ");
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

/**
 * Optional: parse a single location label (from dropdown or mobile) into
 * fields we also persist for cross-platform reads.
 */
export function placementFieldsFromLabel(label) {
  const parts = splitPlacementString(label || "");
  const out = {};
  if (parts[0]) {
    out.room = parts[0];
    out.placementRoom = parts[0];
  }
  if (parts[1]) {
    out.bookcase = parts[1];
    out.shelfUnit = parts[1];
  }
  if (parts[2]) {
    out.shelf = parts[2];
    out.shelfRow = parts[2];
  }
  return out;
}
