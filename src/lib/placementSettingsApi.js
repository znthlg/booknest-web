import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * @param {string} userId
 * @returns {Promise<{ rooms: object[], updatedAt?: unknown } | null>}
 */
export async function getPlacementSettings(userId) {
  if (!userId) return null;
  const snap = await getDoc(doc(db, "users", userId, "settings", "placement"));
  if (!snap.exists()) return null;
  const data = snap.data();
  const tree = data?.placementTree;
  if (!tree || !Array.isArray(tree.rooms) || tree.rooms.length === 0) return null;
  return { rooms: tree.rooms, updatedAt: data.updatedAt };
}
