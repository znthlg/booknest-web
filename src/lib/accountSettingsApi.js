import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * @param {string} userId
 * @returns {Promise<{ firstName?: string, lastName?: string }>}
 */
export async function getAccountDoc(userId) {
  if (!userId) return {};
  const snap = await getDoc(doc(db, "users", userId, "settings", "account"));
  if (!snap.exists()) return {};
  return snap.data() || {};
}

/**
 * @param {string} userId
 * @param {{ firstName?: string, lastName?: string }} fields
 */
export async function saveAccountDoc(userId, fields) {
  if (!userId) throw new Error("Not signed in.");
  await setDoc(
    doc(db, "users", userId, "settings", "account"),
    {
      firstName: fields.firstName ?? "",
      lastName: fields.lastName ?? "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
