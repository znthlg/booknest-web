import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  addDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { booksCollection } from "@/lib/booksApi";

export function categoriesCollection(userId) {
  return collection(db, "users", userId, "categories");
}

export async function listCategories(userId) {
  const snap = await getDocs(categoriesCollection(userId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createCategory(userId, name) {
  const payload = {
    name: name.trim(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(categoriesCollection(userId), payload);
  return ref.id;
}

export async function renameCategory(userId, categoryId, newName) {
  const categoryRef = doc(db, "users", userId, "categories", categoryId);
  await updateDoc(categoryRef, { name: newName.trim() });

  // Keep book docs in sync (so the UI is fast and consistent).
  const booksQ = query(booksCollection(userId), where("categoryId", "==", categoryId));
  const booksSnap = await getDocs(booksQ);

  if (booksSnap.empty) return;

  const batch = writeBatch(db);
  for (const b of booksSnap.docs) {
    batch.update(doc(db, "users", userId, "books", b.id), {
      category: newName.trim(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function deleteCategory(userId, categoryId) {
  // If any books are assigned, block deletion to avoid silent data loss.
  const booksQ = query(booksCollection(userId), where("categoryId", "==", categoryId));
  const booksSnap = await getDocs(booksQ);
  if (!booksSnap.empty) {
    throw new Error("This category is used by one or more books. Reassign those books first.");
  }

  await deleteDoc(doc(db, "users", userId, "categories", categoryId));
}

