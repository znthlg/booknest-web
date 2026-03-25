import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function booksCollection(userId) {
  return collection(db, "users", userId, "books");
}

export async function listBooks(userId) {
  const snapshot = await getDocs(booksCollection(userId));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getBook(userId, bookId) {
  const ref = doc(db, "users", userId, "books", bookId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createBook(userId, data) {
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(booksCollection(userId), payload);
  return ref.id;
}

export async function updateBook(userId, bookId, data) {
  const ref = doc(db, "users", userId, "books", bookId);
  await updateDoc(ref, data);
}

export async function deleteBook(userId, bookId) {
  const ref = doc(db, "users", userId, "books", bookId);
  await deleteDoc(ref);
}

export async function countBooksByAuthor(userId) {
  const all = await listBooks(userId);
  const counts = new Map();

  for (const b of all) {
    const authors = Array.isArray(b.authors)
      ? b.authors.filter(Boolean)
      : b.author
        ? [b.author]
        : [];
    for (const a of authors) {
      const key = a.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count);
}

export async function listBooksByCategoryId(userId, categoryId) {
  const q = query(booksCollection(userId), where("categoryId", "==", categoryId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listBooksByLocationId(userId, locationId) {
  const q = query(booksCollection(userId), where("locationId", "==", locationId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

