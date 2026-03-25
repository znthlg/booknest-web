"use client";

import BookCard from "@/components/BookCard";

export default function BookList({
  books,
  onEdit,
  viewMode = "grid",
  taxonomyLookups = null,
  bulkMode = false,
  selectedIdSet = null,
  onBulkToggle,
}) {
  if (!books || books.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-sm text-foreground/70">No books yet.</div>
        <div className="mt-2 text-sm text-foreground/70">
          Add your first book to start building your library.
        </div>
      </div>
    );
  }

  const containerClass =
    viewMode === "list"
      ? "flex flex-col gap-2"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={containerClass}>
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onEdit={onEdit}
          layout={viewMode}
          taxonomyLookups={taxonomyLookups}
          bulkMode={bulkMode}
          bulkSelected={!!(selectedIdSet && selectedIdSet.has(book.id))}
          onBulkToggle={onBulkToggle}
        />
      ))}
    </div>
  );
}

