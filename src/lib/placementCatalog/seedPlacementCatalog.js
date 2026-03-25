import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildDefaultPlacementSettings } from "./buildDefaultPlacementSettings";

const placementDoc = (userId) => doc(db, "users", userId, "settings", "placement");

/**
 * Seeds `users/{uid}/settings/placement` with `placementTree` (iOS `PlacementSettings` JSON).
 * Skips when `placementTree.rooms` is already non-empty.
 */
export async function ensurePlacementCatalogSeeded(userId) {
  if (!userId) return { skipped: true };

  const snap = await getDoc(placementDoc(userId));
  const rooms = snap.exists() ? snap.data()?.placementTree?.rooms : null;
  if (Array.isArray(rooms) && rooms.length > 0) {
    return { skipped: true, reason: "placement-tree-exists" };
  }

  const placementTree = buildDefaultPlacementSettings();
  await setDoc(
    placementDoc(userId),
    {
      placementTree,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return { seeded: true };
}
