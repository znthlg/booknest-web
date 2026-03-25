import {
  FICTION_MAIN_ID,
  MAIN_CATEGORY_KEYS,
  NONFICTION_MAIN_ID,
  OTHER_MAIN_ID,
  slugKey,
} from "./constants";
import { FICTION_FORM_SPECS } from "./specs/fictionSpecs";
import { NONFICTION_FORM_SPECS } from "./specs/nonfictionSpecs";
import { OTHER_FORM_SPECS } from "./specs/otherSpecs";

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function makeGenre(name) {
  return {
    id: newId(),
    categoryKey: slugKey("genre", name),
    categoryCustom: null,
    name,
  };
}

function makeForm(spec) {
  return {
    id: newId(),
    categoryKey: slugKey("form", spec.title),
    categoryCustom: null,
    name: spec.title,
    genres: spec.genres.map(makeGenre),
  };
}

function makeMain(id, englishTitle, formSpecs) {
  return {
    id,
    categoryKey: MAIN_CATEGORY_KEYS[id] || null,
    categoryCustom: null,
    isSystemPreset: true,
    name: englishTitle,
    forms: formSpecs.map(makeForm),
  };
}

/** iOS CategorySettings.makeDefault() ile aynı ağaç (UUID’ler her üretimde yeni). */
export function buildDefaultCategorySettings() {
  return {
    version: 1,
    mainCategories: [
      makeMain(FICTION_MAIN_ID, "Fiction", FICTION_FORM_SPECS),
      makeMain(NONFICTION_MAIN_ID, "Non-fiction", NONFICTION_FORM_SPECS),
      makeMain(OTHER_MAIN_ID, "Other", OTHER_FORM_SPECS),
    ],
  };
}
