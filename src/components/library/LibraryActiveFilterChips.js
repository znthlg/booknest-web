"use client";

/**
 * Mobildeki Books üst şeridine benzer: geçerli filtrelerin özeti, tek tek kaldırma ve temizleme.
 */
export default function LibraryActiveFilterChips({
  chips,
  onClearAll,
  hasActiveFilters,
}) {
  if (!hasActiveFilters) return null;

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
          Active filters
        </span>
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-medium text-indigo-300/90 hover:text-indigo-200"
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={c.onRemove}
            className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/12 bg-white/5 py-1 pl-2.5 pr-1.5 text-left text-xs text-foreground/85 transition hover:border-indigo-400/30 hover:bg-white/[0.07]"
          >
            <span className="min-w-0 truncate">{c.label}</span>
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] text-foreground/60 group-hover:bg-rose-500/20 group-hover:text-rose-100"
              aria-hidden
            >
              ×
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
