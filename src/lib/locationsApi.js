import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { booksCollection } from "@/lib/booksApi";

export function locationsCollection(userId) {
  return collection(db, "users", userId, "locations");
}

export async function listLocations(userId) {
  const snap = await getDocs(locationsCollection(userId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createLocation(userId, name) {
  const payload = {
    name: name.trim(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(locationsCollection(userId), payload);
  return ref.id;
}

export async function renameLocation(userId, locationId, newName) {
  const locationRef = doc(db, "users", userId, "locations", locationId);
  await updateDoc(locationRef, { name: newName.trim() });

  const booksQ = query(booksCollection(userId), where("locationId", "==", locationId));
  const booksSnap = await getDocs(booksQ);

  if (booksSnap.empty) return;

  const batch = writeBatch(db);
  for (const b of booksSnap.docs) {
    batch.update(doc(db, "users", userId, "books", b.id), {
      location: newName.trim(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function deleteLocation(userId, locationId) {
  const booksQ = query(booksCollection(userId), where("locationId", "==", locationId));
  const booksSnap = await getDocs(booksQ);
  if (!booksSnap.empty) {
    throw new Error("This location is used by one or more books. Reassign those books first.");
  }

  await deleteDoc(doc(db, "users", userId, "locations", locationId));
}

