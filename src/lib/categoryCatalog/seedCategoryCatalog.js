import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildDefaultCategorySettings } from "./buildDefaultCategorySettings";

const SETTINGS_CATEGORIES = (userId) => doc(db, "users", userId, "settings", "categories");
const LEGACY_CATALOG = (userId) => doc(db, "users", userId, "catalog", "categorySettings");

function hasMainCategories(tree) {
  return tree && Array.isArray(tree.mainCategories) && tree.mainCategories.length > 0;
}

/**
 * Ensures iOS-shaped `users/{uid}/settings/categories`:
 * - `categoryTree`: { mainCategories, version? } (Swift `CategorySettings` JSON)
 * - `updatedAt`
 *
 * - If `categoryTree` already has mains → skip.
 * - Else if legacy `catalog/categorySettings` has mains → copy into `categoryTree` (non-destructive for mobile).
 * - Else writes web default tree (no flat categoryMains/Forms/Genres batch; iOS relies on the tree doc).
 */
export async function ensureCategoryCatalogSeeded(userId) {
  if (!userId) return { skipped: true };

  const settingsSnap = await getDoc(SETTINGS_CATEGORIES(userId));
  const existingTree = settingsSnap.exists() ? settingsSnap.data()?.categoryTree : null;
  if (hasMainCategories(existingTree)) {
    return { skipped: true, reason: "settings-category-tree" };
  }

  const legacySnap = await getDoc(LEGACY_CATALOG(userId));
  if (legacySnap.exists()) {
    const data = legacySnap.data();
    if (hasMainCategories(data)) {
      await setDoc(
        SETTINGS_CATEGORIES(userId),
        {
          categoryTree: {
            mainCategories: data.mainCategories,
            version: data.version ?? 1,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { seeded: true, reason: "migrated-legacy-catalog" };
    }
  }

  const settings = buildDefaultCategorySettings();
  await setDoc(
    SETTINGS_CATEGORIES(userId),
    {
      categoryTree: settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return { seeded: true, reason: "default-tree" };
}
