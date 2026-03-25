"use client";

import { use as usePromise, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import BookForm from "@/components/books/BookForm";
import { deleteBook, getBook, updateBook } from "@/lib/booksApi";
import { ensureCategoryCatalogSeeded } from "@/lib/categoryCatalog/seedCategoryCatalog";
import { ensurePlacementCatalogSeeded } from "@/lib/placementCatalog/seedPlacementCatalog";
import { getCategorySettings } from "@/lib/categoryCatalogApi";
import { getPlacementSettings } from "@/lib/placementSettingsApi";
import { getCategoryDisplay } from "@/lib/bookCategory";
import { loadMobileTaxonomyLookups } from "@/lib/mobileBookLookups";
import { normalizeReadingStatus } from "@/lib/readingStatus";

export default function EditBookPage({ params }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [initialBook, setInitialBook] = useState(null);
  const [categorySettings, setCategorySettings] = useState(null);
  const [placementSettings, setPlacementSettings] = useState(null);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  const resolvedParams = usePromise(params);
  const bookId = resolvedParams?.bookId;

  const canSave = useMemo(() => {
    return (
      !!initialBook &&
      !loadingData &&
      (categorySettings?.mainCategories?.length ?? 0) > 0 &&
      (placementSettings?.rooms?.length ?? 0) > 0
    );
  }, [
    categorySettings?.mainCategories?.length,
    initialBook,
    loadingData,
    placementSettings?.rooms?.length,
  ]);

  useEffect(() => {
    const run = async () => {
      if (loading || !user || !bookId) return;
      setLoadingData(true);
      setError("");
      try {
        await ensureCategoryCatalogSeeded(user.uid);
        await ensurePlacementCatalogSeeded(user.uid);
        const [book, catTree, placement, taxonomy] = await Promise.all([
          getBook(user.uid, bookId),
          getCategorySettings(user.uid),
          getPlacementSettings(user.uid),
          loadMobileTaxonomyLookups(user.uid),
        ]);

        if (!book) throw new Error("Book not found.");

        const categoryLine = getCategoryDisplay(book, taxonomy);
        const categoryId = book.categoryId || book.categoryFormId || "";

        setCategorySettings(catTree);
        setPlacementSettings(placement);
        setInitialBook({
          ...book,
          authors: Array.isArray(book.authors)
            ? book.authors
            : book.author
              ? [book.author]
              : [],
          categoryMainId: book.categoryMainId || "",
          categoryFormId: book.categoryFormId || "",
          categoryGenreId: book.categoryGenreId || "",
          categoryId,
          category:
            (typeof book.category === "string" ? book.category : "") || categoryLine || "",
          physicalRoomId: book.physicalRoomId || "",
          physicalBookshelfId: book.physicalBookshelfId || "",
          physicalShelfId: book.physicalShelfId || "",
          readingStatus: normalizeReadingStatus(book.readingStatus),
          language: book.language || book.publicationLanguage || "",
          coverImageUrl: book.coverImageUrl || "",
          thumbnailURL: book.thumbnailURL || "",
        });
      } catch (err) {
        setError(err?.message || "Failed to load the book.");
      } finally {
        setLoadingData(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, loading, user?.uid]);

  const onSubmit = async (payload) => {
    if (!user || !initialBook) return;
    await updateBook(user.uid, bookId, payload);
    router.push("/dashboard/library");
  };

  const onDelete = async () => {
    if (!user) return;
    const confirmed = window.confirm("Delete this book? This cannot be undone.");
    if (!confirmed) return;
    await deleteBook(user.uid, bookId);
    router.push("/dashboard/library");
  };

  if (loading || loadingData) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <div className="text-sm text-foreground/70">Loading…</div>
      </div>
    );
  }

  return (
    <div className="pb-28 sm:pb-24">
      {error ? (
        <div className="mb-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {!canSave ? (
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm font-medium text-foreground/85">Before you edit</div>
          <div className="mt-2 text-sm text-foreground/60">
            Category catalog or placement tree is not ready yet. Open the dashboard once, then try again.
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/15 transition"
        >
          Delete Book
        </button>
      </div>

      <BookForm
        mode="edit"
        userId={user.uid}
        initialBook={initialBook}
        categorySettings={categorySettings}
        placementSettings={placementSettings}
        onSubmit={onSubmit}
      />
    </div>
  );
}
