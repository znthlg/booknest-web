import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function uniqueIds(bookIds) {
  return [...new Set((bookIds || []).filter(Boolean))];
}

/**
 * @param {string} userId
 * @param {string[]} bookIds
 * @param {string} readingStatus
 */
export async function bulkUpdateReadingStatus(userId, bookIds, readingStatus) {
  const ids = uniqueIds(bookIds);
  if (!userId || !ids.length) return;
  await Promise.all(
    ids.map((id) =>
      updateDoc(doc(db, "users", userId, "books", id), { readingStatus })
    )
  );
}

/**
 * Firestore alanları iOS `addBook` ile uyumlu (boş string).
 * @param {string} userId
 * @param {string[]} bookIds
 * @param {{ categoryMainId: string, categoryFormId: string, categoryGenreId: string, category: string, categoryId: string }} fields
 */
export async function bulkUpdateCategory(userId, bookIds, fields) {
  const ids = uniqueIds(bookIds);
  if (!userId || !ids.length) return;
  const payload = {
    categoryMainId: fields.categoryMainId ?? "",
    categoryFormId: fields.categoryFormId ?? "",
    categoryGenreId: fields.categoryGenreId ?? "",
    category: fields.category ?? "",
    categoryId: fields.categoryId ?? fields.categoryFormId ?? "",
  };
  await Promise.all(
    ids.map((id) => updateDoc(doc(db, "users", userId, "books", id), payload))
  );
}

/**
 * @param {string} userId
 * @param {string[]} bookIds
 * @param {{ physicalRoomId: string, physicalBookshelfId: string, physicalShelfId: string, location: string }} fields
 */
export async function bulkUpdatePlacement(userId, bookIds, fields) {
  const ids = uniqueIds(bookIds);
  if (!userId || !ids.length) return;
  const payload = {
    physicalRoomId: fields.physicalRoomId ?? "",
    physicalBookshelfId: fields.physicalBookshelfId ?? "",
    physicalShelfId: fields.physicalShelfId ?? "",
    location: fields.location ?? "",
  };
  await Promise.all(
    ids.map((id) => updateDoc(doc(db, "users", userId, "books", id), payload))
  );
}

/**
 * @param {string} userId
 * @param {string[]} bookIds
 */
export async function bulkDeleteBooks(userId, bookIds) {
  const ids = uniqueIds(bookIds);
  if (!userId || !ids.length) return;
  await Promise.all(
    ids.map((id) => deleteDoc(doc(db, "users", userId, "books", id)))
  );
}
