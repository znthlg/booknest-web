"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import BookForm from "@/components/books/BookForm";
import { createBook, listBooks } from "@/lib/booksApi";
import { writeLastPlacementPreference } from "@/lib/lastPlacementPreference";
import { ensureCategoryCatalogSeeded } from "@/lib/categoryCatalog/seedCategoryCatalog";
import { ensurePlacementCatalogSeeded } from "@/lib/placementCatalog/seedPlacementCatalog";
import { getCategorySettings } from "@/lib/categoryCatalogApi";
import { getPlacementSettings } from "@/lib/placementSettingsApi";

export default function AddBookPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [categorySettings, setCategorySettings] = useState(null);
  const [placementSettings, setPlacementSettings] = useState(null);
  const [existingBooks, setExistingBooks] = useState(/** @type {object[]} */ ([]));
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  const canSave = useMemo(() => {
    return (
      !loading &&
      !!user &&
      (categorySettings?.mainCategories?.length ?? 0) > 0 &&
      (placementSettings?.rooms?.length ?? 0) > 0
    );
  }, [categorySettings?.mainCategories?.length, loading, placementSettings?.rooms?.length, user]);

  const loadLists = async () => {
    if (!user) return;
    setError("");
    setLoadingData(true);
    try {
      await ensureCategoryCatalogSeeded(user.uid);
      await ensurePlacementCatalogSeeded(user.uid);
      const [tree, placement, books] = await Promise.all([
        getCategorySettings(user.uid),
        getPlacementSettings(user.uid),
        listBooks(user.uid),
      ]);

      setCategorySettings(tree);
      setPlacementSettings(placement);
      setExistingBooks(books);
    } catch (err) {
      setError(err?.message || "Failed to load catalog and placement.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loading && user) loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.uid]);

  const onSubmit = async (payload) => {
    if (!user) return;
    await createBook(user.uid, payload);
    if (payload.physicalRoomId && payload.physicalBookshelfId && payload.physicalShelfId) {
      writeLastPlacementPreference(user.uid, {
        physicalRoomId: payload.physicalRoomId,
        physicalBookshelfId: payload.physicalBookshelfId,
        physicalShelfId: payload.physicalShelfId,
      });
    }
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
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm font-medium text-foreground/85">Before you add a book</div>
          <div className="mt-2 text-sm text-foreground/60">
            Wait for category and placement to sync (open the dashboard once), then reload this page.
          </div>
        </div>
      ) : null}

      <BookForm
        mode="add"
        userId={user.uid}
        existingBooks={existingBooks}
        categorySettings={categorySettings}
        placementSettings={placementSettings}
        onSubmit={onSubmit}
        initialBook={null}
      />
    </div>
  );
}
