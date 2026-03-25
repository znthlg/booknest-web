import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * @param {string} userId
 * @param {object[]} rooms — placementTree.rooms
 */
export async function savePlacementTree(userId, rooms) {
  if (!userId) throw new Error("Not signed in.");
  await setDoc(
    doc(db, "users", userId, "settings", "placement"),
    {
      placementTree: { rooms },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
