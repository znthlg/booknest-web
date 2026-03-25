import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCategorySettings } from "@/lib/categoryCatalogApi";
import { getPlacementSettings } from "@/lib/placementSettingsApi";
import { categoryTreeToLookupMaps, placementTreeToLookupMaps } from "@/lib/taxonomyTreeMaps";

/**
 * iOS BookNest: books use physicalRoomId, physicalBookshelfId, physicalShelfId
 * and categoryMainId / categoryFormId / categoryGenreId on each book doc.
 *
 * Display names:
 * - Prefer `settings/categories` + `settings/placement` trees (same as iOS).
 * - Merge flat subcollections when present (older web-only data).
 */
const TAXONOMY_ALIASES = {
  physicalRooms: ["physicalRooms", "physicalLocations", "PhysicalRooms"],
  physicalBookshelves: ["physicalBookshelves", "physicalBookcases", "PhysicalBookshelves"],
  physicalShelves: ["physicalShelves", "PhysicalShelves"],
  categoryMains: ["categoryMains", "CategoryMains", "presetCategoryMains"],
  categoryForms: ["categoryForms", "CategoryForms"],
  categoryGenres: ["categoryGenres", "CategoryGenres"],
};

function labelFromDoc(data) {
  if (!data || typeof data !== "object") return "";
  const v = data.name ?? data.title ?? data.label ?? data.displayName ?? data.localizedName;
  return v != null ? String(v).trim() : "";
}

/**
 * @returns {Promise<Record<string, string>>}
 */
async function mergeCollectionMaps(userId, segmentNames) {
  const map = {};
  for (const segment of segmentNames) {
    try {
      const snap = await getDocs(collection(db, "users", userId, segment));
      for (const d of snap.docs) {
        const label = labelFromDoc(d.data());
        if (label) map[d.id] = label;
      }
    } catch {
      /* missing collection or rules */
    }
  }
  return map;
}

function overlayMaps(base, overlay) {
  return { ...base, ...overlay };
}

export async function loadMobileTaxonomyLookups(userId) {
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  const keys = Object.keys(TAXONOMY_ALIASES);

  await Promise.all(
    keys.map(async (key) => {
      out[key] = await mergeCollectionMaps(userId, TAXONOMY_ALIASES[key]);
    })
  );

  const [catSettings, placeSettings] = await Promise.all([
    getCategorySettings(userId),
    getPlacementSettings(userId),
  ]);

  if (catSettings?.mainCategories?.length) {
    const fromTree = categoryTreeToLookupMaps(catSettings.mainCategories);
    out.categoryMains = overlayMaps(out.categoryMains, fromTree.categoryMains);
    out.categoryForms = overlayMaps(out.categoryForms, fromTree.categoryForms);
    out.categoryGenres = overlayMaps(out.categoryGenres, fromTree.categoryGenres);
  }

  if (placeSettings?.rooms?.length) {
    const pm = placementTreeToLookupMaps(placeSettings.rooms);
    out.physicalRooms = overlayMaps(out.physicalRooms, pm.physicalRooms);
    out.physicalBookshelves = overlayMaps(out.physicalBookshelves, pm.physicalBookshelves);
    out.physicalShelves = overlayMaps(out.physicalShelves, pm.physicalShelves);
  }

  return out;
}
