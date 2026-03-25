"use client";

import { useEffect, useMemo, useState } from "react";

const readingStatusOptions = [
  "Not started",
  "Reading",
  "Finished",
  "On hold",
  "Abandoned",
];

export default function AddBookModal({
  isOpen,
  mode = "add",
  initialValues,
  onClose,
  onSave,
}) {
  const safeInitial = useMemo(() => {
    if (!initialValues) {
      return {
        title: "",
        author: "",
        category: "",
        location: "",
        readingStatus: "Not started",
      };
    }

    return {
      title: initialValues.title || "",
      author: initialValues.author || "",
      category: initialValues.category || "",
      location: initialValues.location || "",
      readingStatus: initialValues.readingStatus || "Not started",
    };
  }, [initialValues]);

  const [values, setValues] = useState(safeInitial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setValues(safeInitial);
    setSubmitting(false);
    setError("");
  }, [isOpen, safeInitial]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      title: values.title.trim(),
      author: values.author.trim(),
      category: values.category.trim(),
      location: values.location.trim(),
      readingStatus: values.readingStatus,
    };

    if (!payload.title) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-widest text-foreground/70">
              {mode === "edit" ? "EDIT BOOK" : "ADD BOOK"}
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              {mode === "edit" ? "Update details" : "Add to your library"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground/85 hover:bg-white/10 hover:border-white/15 transition"
          >
            Close
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Title
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              required
              placeholder="e.g. The Pragmatic Programmer"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Author
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
              value={values.author}
              onChange={(e) => setValues((v) => ({ ...v, author: e.target.value }))}
              placeholder="e.g. Andrew Hunt"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/80">
                Category
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                value={values.category}
                onChange={(e) =>
                  setValues((v) => ({ ...v, category: e.target.value }))
                }
                placeholder="e.g. Software"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/80">
                Location
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
                value={values.location}
                onChange={(e) =>
                  setValues((v) => ({ ...v, location: e.target.value }))
                }
                placeholder="e.g. Living room / Shelf B"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Reading status
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
              value={values.readingStatus}
              onChange={(e) =>
                setValues((v) => ({ ...v, readingStatus: e.target.value }))
              }
            >
              {readingStatusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? mode === "edit"
                ? "Saving changes..."
                : "Adding book..."
              : mode === "edit"
                ? "Save changes"
                : "Add book"}
          </button>
        </form>
      </div>
    </div>
  );
}

