"use client";

/**
 * Mobil Books ekranındaki bulk seçim çubuğu: en az bir kitap seçilince gösterilir.
 */
export default function BulkBooksToolbar({
  selectedCount,
  filteredCount,
  onSelectAllFiltered,
  onOpenStatus,
  onOpenCategory,
  onOpenPlacement,
  onOpenDelete,
  onExitBulk,
  busy = false,
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-4 pt-2 sm:px-8">
      <div
        className="pointer-events-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-white/15 bg-[var(--background)]/95 px-3 py-3 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
        style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.35)" }}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/85">
          <span className="font-semibold tabular-nums">{selectedCount}</span>
          <span className="text-foreground/60">selected</span>
          {filteredCount > selectedCount ? (
            <button
              type="button"
              onClick={onSelectAllFiltered}
              disabled={busy}
              className="ml-1 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-200 hover:bg-indigo-500/15 disabled:opacity-50"
            >
              Select all ({filteredCount})
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenStatus}
            disabled={busy}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-white/10 disabled:opacity-50"
          >
            Status
          </button>
          <button
            type="button"
            onClick={onOpenCategory}
            disabled={busy}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-white/10 disabled:opacity-50"
          >
            Category
          </button>
          <button
            type="button"
            onClick={onOpenPlacement}
            disabled={busy}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-white/10 disabled:opacity-50"
          >
            Placement
          </button>
          <button
            type="button"
            onClick={onOpenDelete}
            disabled={busy}
            className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onExitBulk}
            disabled={busy}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground/55 hover:bg-white/10 disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
