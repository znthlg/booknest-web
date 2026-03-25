/** @typedef {{ id: string, categoryKey: string | null, categoryCustom: string | null, name: string }} GenreNode */
/** @typedef {{ id: string, categoryKey: string | null, categoryCustom: string | null, name: string, genres: GenreNode[] }} FormNode */
/** @typedef {{ id: string, categoryKey: string | null, categoryCustom: string | null, isSystemPreset: boolean, name: string, forms: FormNode[] }} MainNode */
/** @typedef {{ mainCategories: MainNode[], version: number }} CategorySettingsDoc */

export const FICTION_MAIN_ID = "preset-main-fiction";
export const NONFICTION_MAIN_ID = "preset-main-nonfiction";
export const OTHER_MAIN_ID = "preset-main-other";

export const MAIN_CATEGORY_KEYS = {
  [FICTION_MAIN_ID]: "cat_main_fiction",
  [NONFICTION_MAIN_ID]: "cat_main_nonfiction",
  [OTHER_MAIN_ID]: "cat_main_other",
};

export function slugKey(prefix, englishTitle) {
  const tail = englishTitle
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${prefix}_${tail}`;
}
