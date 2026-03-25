import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const LEGACY_CATALOG_REF = (userId) => doc(db, "users", userId, "catalog", "categorySettings");
const SETTINGS_CATEGORIES_REF = (userId) => doc(db, "users", userId, "settings", "categories");

/**
 * iOS: `users/{uid}/settings/categories` → field `categoryTree` (CategorySettings JSON).
 * Legacy web: `users/{uid}/catalog/categorySettings` with top-level `mainCategories`.
 *
 * @param {string} userId
 * @returns {Promise<{ mainCategories: object[], version?: number, updatedAt?: unknown } | null>}
 */
export async function getCategorySettings(userId) {
  if (!userId) return null;

  const settingsSnap = await getDoc(SETTINGS_CATEGORIES_REF(userId));
  if (settingsSnap.exists()) {
    const tree = settingsSnap.data()?.categoryTree;
    if (tree && Array.isArray(tree.mainCategories) && tree.mainCategories.length > 0) {
      return {
        mainCategories: tree.mainCategories,
        version: tree.version,
        updatedAt: settingsSnap.data()?.updatedAt,
      };
    }
  }

  const legacySnap = await getDoc(LEGACY_CATALOG_REF(userId));
  if (legacySnap.exists()) {
    const data = legacySnap.data();
    if (Array.isArray(data?.mainCategories) && data.mainCategories.length > 0) {
      return { mainCategories: data.mainCategories, version: data.version };
    }
  }

  return null;
}
