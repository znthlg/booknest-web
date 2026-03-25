"use client";

import { useEffect, useState } from "react";
import { newTaxonomyId } from "@/lib/taxonomyIds";
import { saveCategoryTree } from "@/lib/categorySettingsWrites";

function cloneMains(mains) {
  if (!mains?.length) return [];
  return JSON.parse(JSON.stringify(mains));
}

function emptyMain() {
  return {
    id: newTaxonomyId(),
    categoryKey: null,
    categoryCustom: null,
    isSystemPreset: false,
    name: "New main category",
    forms: [],
  };
}

function emptyForm() {
  return {
    id: newTaxonomyId(),
    categoryKey: null,
    categoryCustom: null,
    name: "New form",
    genres: [],
  };
}

function emptyGenre() {
  return {
    id: newTaxonomyId(),
    categoryKey: null,
    categoryCustom: null,
    name: "New genre",
  };
}

export default function CategoryTreeEditor({ userId, initialMains, onSaved }) {
  const [mains, setMains] = useState([]);
  const [mainIdx, setMainIdx] = useState(-1);
  const [formIdx, setFormIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const next = cloneMains(initialMains);
    setMains(next);
    if (!next.length) {
      setMainIdx(-1);
      setFormIdx(-1);
      return;
    }
    setMainIdx((mi) => (mi >= 0 && mi < next.length ? mi : -1));
  }, [initialMains]);

  useEffect(() => {
    if (mainIdx < 0 || mainIdx >= mains.length) {
      setFormIdx(-1);
      return;
    }
    setFormIdx((fi) => {
      const forms = mains[mainIdx]?.forms || [];
      if (!forms.length) return -1;
      if (fi < 0) return -1;
      return Math.min(fi, forms.length - 1);
    });
  }, [mains, mainIdx]);

  const main = mainIdx >= 0 ? mains[mainIdx] : null;
  const forms = main?.forms || [];
  const form = formIdx >= 0 ? forms[formIdx] : null;
  const genres = form?.genres || [];

  const openMain = (i) => {
    setMainIdx(i);
    setFormIdx(-1);
  };

  const backToMains = () => {
    setMainIdx(-1);
    setFormIdx(-1);
  };

  const openForm = (fi) => {
    setFormIdx(fi);
  };

  const backToForms = () => {
    setFormIdx(-1);
  };

  const updateMain = (i, patch) => {
    setMains((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const updateForm = (mi, fi, patch) => {
    setMains((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      n[mi].forms[fi] = { ...n[mi].forms[fi], ...patch };
      return n;
    });
  };

  const updateGenre = (mi, fi, gi, patch) => {
    setMains((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      n[mi].forms[fi].genres[gi] = { ...n[mi].forms[fi].genres[gi], ...patch };
      return n;
    });
  };

  const addMain = () => {
    const newIdx = mains.length;
    setMains((prev) => [...prev, emptyMain()]);
    setMainIdx(-1);
    setFormIdx(-1);
  };

  const removeMain = (i) => {
    if (!window.confirm("Remove this main category and all its forms/genres? Books may keep old IDs.")) return;
    const next = mains.filter((_, j) => j !== i);
    setMains(next);
    if (mainIdx === i) {
      setMainIdx(-1);
      setFormIdx(-1);
    } else if (i < mainIdx) {
      setMainIdx(mainIdx - 1);
    }
    if (!next.length) {
      setMainIdx(-1);
      setFormIdx(-1);
    }
  };

  const addForm = (mi) => {
    const newIdx = (mains[mi]?.forms || []).length;
    setMains((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      n[mi].forms = [...(n[mi].forms || []), emptyForm()];
      return n;
    });
    if (mi === mainIdx) setFormIdx(newIdx);
  };

  const removeForm = (mi, fi) => {
    if (mi !== mainIdx) {
      setMains((prev) => {
        const n = JSON.parse(JSON.stringify(prev));
        n[mi].forms = n[mi].forms.filter((_, j) => j !== fi);
        return n;
      });
      return;
    }
    const next = JSON.parse(JSON.stringify(mains));
    next[mi].forms = next[mi].forms.filter((_, j) => j !== fi);
    setMains(next);
    const fl = next[mi].forms.length;
    let nf = formIdx;
    if (!fl) nf = -1;
    else if (fi < formIdx) nf = formIdx - 1;
    else if (fi === formIdx) nf = -1;
    setFormIdx(nf);
  };

  const addGenre = (mi, fi) => {
    setMains((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      n[mi].forms[fi].genres = [...(n[mi].forms[fi].genres || []), emptyGenre()];
      return n;
    });
  };

  const removeGenre = (mi, fi, gi) => {
    setMains((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      n[mi].forms[fi].genres = n[mi].forms[fi].genres.filter((_, j) => j !== gi);
      return n;
    });
  };

  const onSave = async () => {
    if (!userId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveCategoryTree(userId, mains);
      setMessage("Categories saved.");
      await onSaved?.();
    } catch (e) {
      setError(e?.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ——— Main categories (always first) ——— */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-foreground/80">Main categories</div>
            <div className="mt-0.5 text-[11px] text-foreground/45">
              Rename here. Tap a row to open its forms, then a form for genres.
            </div>
          </div>
          <button
            type="button"
            onClick={addMain}
            className="shrink-0 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-500/15"
          >
            + New main
          </button>
        </div>

        {!mains.length ? (
          <p className="rounded-xl border border-white/10 bg-white/5 py-8 text-center text-sm text-foreground/50">
            No categories yet. Add a main or reload after seeding.
          </p>
        ) : (
          <ul className="space-y-2">
            {mains.map((m, i) => (
              <li
                key={m.id}
                className={`rounded-xl border px-3 py-2 transition ${
                  mainIdx === i
                    ? "border-indigo-400/35 bg-indigo-500/[0.08]"
                    : "border-white/10 bg-white/[0.04] hover:border-white/15"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={m.name || ""}
                    onChange={(e) => updateMain(i, { name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
                    placeholder="Main name"
                  />
                  <span className="text-[11px] tabular-nums text-foreground/40">
                    {(m.forms || []).length} forms
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMain(i)}
                    className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => openMain(i)}
                    className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-foreground/90 hover:bg-white/15"
                  >
                    Forms →
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ——— Forms (after choosing a main) ——— */}
      {mainIdx >= 0 && main ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={backToMains}
            className="mb-3 text-xs font-medium text-indigo-300/90 hover:text-indigo-200"
          >
            ← Main categories
          </button>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-foreground/80">Forms</div>
              <div className="text-[11px] text-foreground/45">Inside “{main.name || "…"}”</div>
            </div>
            <button
              type="button"
              onClick={() => addForm(mainIdx)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
            >
              + New form
            </button>
          </div>

          {!forms.length ? (
            <p className="text-sm text-foreground/45">No forms yet. Add one, then open it for genres.</p>
          ) : (
            <ul className="space-y-2">
              {forms.map((f, fi) => (
                <li
                  key={f.id}
                  className={`rounded-xl border px-3 py-2 transition ${
                    formIdx === fi
                      ? "border-indigo-400/35 bg-indigo-500/[0.08]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/15"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={f.name || ""}
                      onChange={(e) => updateForm(mainIdx, fi, { name: e.target.value })}
                      className="min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
                      placeholder="Form name"
                    />
                    <span className="text-[11px] text-foreground/40">
                      {(f.genres || []).length} genres
                    </span>
                    <button
                      type="button"
                      onClick={() => removeForm(mainIdx, fi)}
                      className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => openForm(fi)}
                      className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15"
                    >
                      Genres →
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* ——— Genres (after choosing a form) ——— */}
      {mainIdx >= 0 && formIdx >= 0 && form ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={backToForms}
            className="mb-3 text-xs font-medium text-indigo-300/90 hover:text-indigo-200"
          >
            ← Forms in “{main.name || "…"}”
          </button>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-foreground/80">Genres</div>
              <div className="text-[11px] text-foreground/45">For “{form.name || "…"}” (optional)</div>
            </div>
            <button
              type="button"
              onClick={() => addGenre(mainIdx, formIdx)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
            >
              + Genre
            </button>
          </div>
          {!genres.length ? (
            <p className="text-sm text-foreground/45">No genres yet.</p>
          ) : (
            <ul className="space-y-2">
              {genres.map((genre, gi) => (
                <li
                  key={genre.id}
                  className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2"
                >
                  <input
                    value={genre.name || ""}
                    onChange={(e) => updateGenre(mainIdx, formIdx, gi, { name: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    placeholder="Genre name"
                  />
                  <button
                    type="button"
                    onClick={() => removeGenre(mainIdx, formIdx, gi)}
                    className="px-2 text-foreground/45 hover:text-rose-300"
                    aria-label="Remove genre"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300/90">{message}</p> : null}

      <button
        type="button"
        disabled={busy || !userId}
        onClick={onSave}
        className="w-full rounded-2xl bg-indigo-500 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save categories"}
      </button>
    </div>
  );
}
