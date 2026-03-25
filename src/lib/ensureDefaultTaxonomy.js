import {
  collection,
  doc,
  limit,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Varsayılan kayıtlar (`users/{uid}/locations`) — eski web ekranları için.
 * Fiziksel raf: iOS ile `users/{uid}/settings/placement` (`placementTree`).
 * Kategori ağacı: `users/{uid}/settings/categories` (`categoryTree`).
 */
export const DEFAULT_WEB_LOCATION_NAMES = [
  "Oturma odası",
  "Yatak odası",
  "Ofis",
  "Diğer",
];

function metaRef(userId) {
  return doc(db, "users", userId, "meta", "webTaxonomyDefaults");
}

/**
 * İlk girişte konum listesi boşsa varsayılanları yazar.
 * `meta/webTaxonomyDefaults` ile tekrar çalışması engellenir.
 */
export async function ensureDefaultWebTaxonomy(userId) {
  if (!userId) return;

  const locsCol = collection(db, "users", userId, "locations");

  await runTransaction(db, async (transaction) => {
    const metaSnap = await transaction.get(metaRef(userId));
    if (metaSnap.exists() && metaSnap.data()?.applied === true) {
      return;
    }

    const lSnap = await transaction.get(query(locsCol, limit(1)));

    if (lSnap.empty) {
      for (const name of DEFAULT_WEB_LOCATION_NAMES) {
        const ref = doc(locsCol);
        transaction.set(ref, {
          name,
          createdAt: serverTimestamp(),
          source: "web-default",
        });
      }
    }

    transaction.set(
      metaRef(userId),
      { applied: true, at: serverTimestamp() },
      { merge: true }
    );
  });
}
