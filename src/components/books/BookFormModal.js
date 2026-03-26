"use client";

import { useState } from "react";
import BookForm from "@/components/books/BookForm";

export default function BookFormModal({
  isOpen,
  mode,
  initialBook,
  categorySettings,
  placementSettings,
  userId = "",
  onClose,
  onSave,
  onDelete,
}) {
  const [actionError, setActionError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (payload) => {
    setActionError("");
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setActionError(err?.message || "Unable to save.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative flex max-h-[min(92dvh,56rem)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[var(--background)] shadow-2xl sm:rounded-3xl sm:border-white/10"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="text-xs tracking-widest text-foreground/70">
              {mode === "edit" ? "EDIT BOOK" : "ADD BOOK"}
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              {mode === "edit" ? "Update details" : "Add to your collection"}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {mode === "edit" && typeof onDelete === "function" ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/15"
              >
                Delete
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground/85 transition hover:border-white/15 hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        {actionError ? (
          <div className="shrink-0 border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:px-6">
            {actionError}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-4 sm:px-6">
          <BookForm
            key={initialBook?.id ?? "new"}
            mode={mode}
            userId={userId}
            initialBook={initialBook}
            categorySettings={categorySettings}
            placementSettings={placementSettings}
            onSubmit={handleSubmit}
            hidePageTitle
            variant="modal"
          />
        </div>
      </div>
    </div>
  );
}
