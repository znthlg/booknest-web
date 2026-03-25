import {
  labelPlacementBookshelf,
  labelPlacementRoom,
  labelPlacementShelf,
} from "@/lib/taxonomyTreeMaps";

/**
 * @param {{ mainCategories?: object[] } | null} categorySettings
 * @param {string} categoryMainId
 * @param {string} categoryFormId
 * @param {string} [categoryGenreId]
 */
export function buildBulkCategoryPayload(
  categorySettings,
  categoryMainId,
  categoryFormId,
  categoryGenreId = ""
) {
  const mains = categorySettings?.mainCategories ?? [];
  const main = mains.find((m) => m.id === categoryMainId);
  const form = main?.forms?.find((f) => f.id === categoryFormId);
  const genre = form?.genres?.find((g) => g.id === categoryGenreId);
  const parts = [main?.name, form?.name, genre?.name].filter(Boolean);
  return {
    categoryMainId: categoryMainId || "",
    categoryFormId: categoryFormId || "",
    categoryGenreId: categoryGenreId || "",
    categoryId: categoryFormId || "",
    category: parts.join(" · "),
  };
}

/**
 * @param {{ rooms?: object[] } | null} placementSettings
 * @param {string} physicalRoomId
 * @param {string} physicalBookshelfId
 * @param {string} physicalShelfId
 */
export function buildBulkPlacementPayload(
  placementSettings,
  physicalRoomId,
  physicalBookshelfId,
  physicalShelfId
) {
  const room = placementSettings?.rooms?.find((r) => r.id === physicalRoomId);
  const bs = room?.bookshelves?.find((b) => b.id === physicalBookshelfId);
  const sh = bs?.shelves?.find((s) => s.id === physicalShelfId);
  const parts = [
    room ? labelPlacementRoom(room) : "",
    bs ? labelPlacementBookshelf(bs) : "",
    sh ? labelPlacementShelf(sh) : "",
  ].filter(Boolean);
  return {
    physicalRoomId: physicalRoomId || "",
    physicalBookshelfId: physicalBookshelfId || "",
    physicalShelfId: physicalShelfId || "",
    location: parts.join(" · "),
  };
}
