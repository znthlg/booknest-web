/**
 * Books / library sayfası URL sorgu parametreleri (Shelf ve mobil derin linklerle uyumlu).
 * `search` kutusu URL'de tutulmaz.
 */
export function buildBooksLibraryQuery({
  categoryMainFilter,
  categoryFormFilter,
  categoryGenreFilter,
  placementRoomFilter,
  readingStatus,
  filterGift,
  filterSigned,
  filterLent,
}) {
  const p = new URLSearchParams();
  if (categoryMainFilter && categoryMainFilter !== "all")
    p.set("main", categoryMainFilter);
  if (categoryFormFilter && categoryFormFilter !== "all")
    p.set("form", categoryFormFilter);
  if (categoryGenreFilter && categoryGenreFilter !== "all")
    p.set("genre", categoryGenreFilter);
  if (placementRoomFilter && placementRoomFilter !== "all")
    p.set("room", placementRoomFilter);
  if (readingStatus && readingStatus !== "all") p.set("status", readingStatus);
  if (filterGift) p.set("gift", "1");
  if (filterSigned) p.set("signed", "1");
  if (filterLent) p.set("lent", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function applySearchParamsToLibraryState(searchParams) {
  return {
    categoryMainFilter: searchParams.get("main") || "all",
    categoryFormFilter: searchParams.get("form") || "all",
    categoryGenreFilter: searchParams.get("genre") || "all",
    placementRoomFilter: searchParams.get("room") || "all",
    readingStatus: searchParams.get("status") || "all",
    filterGift: searchParams.get("gift") === "1",
    filterSigned: searchParams.get("signed") === "1",
    filterLent: searchParams.get("lent") === "1",
  };
}
