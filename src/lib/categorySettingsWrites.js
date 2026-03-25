import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * @param {string} userId
 * @param {object[]} mainCategories — Swift CategorySettings.mainCategories şekli
 */
export async function saveCategoryTree(userId, mainCategories) {
  if (!userId) throw new Error("Not signed in.");
  await setDoc(
    doc(db, "users", userId, "settings", "categories"),
    {
      categoryTree: {
        mainCategories,
        version: 1,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
