import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Flat / legacy taxonomy collections (same aliases as mobileBookLookups). */
const USER_SUBCOLLECTIONS_TO_CLEAR = [
  "books",
  "locations",
  "categories",
  "physicalRooms",
  "physicalLocations",
  "PhysicalRooms",
  "physicalBookshelves",
  "physicalBookcases",
  "PhysicalBookshelves",
  "physicalShelves",
  "PhysicalShelves",
  "categoryMains",
  "CategoryMains",
  "presetCategoryMains",
  "categoryForms",
  "CategoryForms",
  "categoryGenres",
  "CategoryGenres",
];

async function deleteDocRefsInChunks(refs) {
  const chunk = 450;
  for (let i = 0; i < refs.length; i += chunk) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + chunk)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

async function emptyNamedSubcollection(userId, name) {
  const snap = await getDocs(collection(db, "users", userId, name));
  if (!snap.empty) {
    await deleteDocRefsInChunks(snap.docs.map((d) => d.ref));
  }
}

/**
 * Removes client-known Firestore data under `users/{userId}`. Does not delete the Auth user.
 * Call after reauthentication; fails if security rules deny deletes.
 */
export async function deleteAllUserFirestoreData(userId) {
  if (!userId) throw new Error("Not signed in.");

  for (const name of USER_SUBCOLLECTIONS_TO_CLEAR) {
    await emptyNamedSubcollection(userId, name);
  }

  const settingsSnap = await getDocs(collection(db, "users", userId, "settings"));
  if (!settingsSnap.empty) {
    await deleteDocRefsInChunks(settingsSnap.docs.map((d) => d.ref));
  }

  const optionalDocs = [
    doc(db, "users", userId, "catalog", "categorySettings"),
    doc(db, "users", userId, "meta", "webTaxonomyDefaults"),
  ];
  for (const ref of optionalDocs) {
    try {
      await deleteDoc(ref);
    } catch {
      /* may not exist */
    }
  }

  try {
    await deleteDoc(doc(db, "users", userId));
  } catch {
    /* root user doc may not exist */
  }
}
