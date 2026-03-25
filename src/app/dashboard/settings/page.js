"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { ensureCategoryCatalogSeeded } from "@/lib/categoryCatalog/seedCategoryCatalog";
import { getCategorySettings } from "@/lib/categoryCatalogApi";
import { ensurePlacementCatalogSeeded } from "@/lib/placementCatalog/seedPlacementCatalog";
import { getPlacementSettings } from "@/lib/placementSettingsApi";
import AccountProfileSection from "@/components/settings/AccountProfileSection";
import CategoryTreeEditor from "@/components/settings/CategoryTreeEditor";
import PlacementTreeEditor from "@/components/settings/PlacementTreeEditor";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";

const CONTACT_EMAIL = "hello@zenithalig.com";

/** Support address only inside mailto; never shown as readable text on the page. To field only. */
function contactMailtoHref() {
  return `mailto:${CONTACT_EMAIL}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [error, setError] = useState("");
  const [taxonomyError, setTaxonomyError] = useState("");
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [mainCategories, setMainCategories] = useState(/** @type {object[]} */ ([]));
  const [placementRooms, setPlacementRooms] = useState(/** @type {object[]} */ ([]));

  const loadTaxonomy = useCallback(async () => {
    if (!user?.uid) return;
    setTaxonomyError("");
    setTaxonomyLoading(true);
    try {
      await ensureCategoryCatalogSeeded(user.uid);
      await ensurePlacementCatalogSeeded(user.uid);
      const [cat, place] = await Promise.all([
        getCategorySettings(user.uid),
        getPlacementSettings(user.uid),
      ]);
      setMainCategories(cat?.mainCategories ? [...cat.mainCategories] : []);
      setPlacementRooms(place?.rooms ? [...place.rooms] : []);
    } catch (err) {
      setTaxonomyError(err?.message || "Could not load categories or placement.");
    } finally {
      setTaxonomyLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (loading || !user) return;
    loadTaxonomy();
  }, [loading, user, loadTaxonomy]);

  const doLogout = async () => {
    setError("");
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (err) {
      setError(err?.message || "Unable to sign out.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <div className="text-sm text-foreground/70">Loading…</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 pb-16">
      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="text-xs font-semibold tracking-widest text-foreground/55">ACCOUNT</div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground/95">
          Profile & security
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Name and photo appear on your shelf overview; password keeps your email login secure.
        </p>
        <div className="mt-6">
          <AccountProfileSection user={user} userId={user.uid} />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="text-xs font-semibold tracking-widest text-foreground/55">LIBRARY STRUCTURE</div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground/95">
          Categories & placement
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Same trees as the mobile app: edit names, add rows, remove sections. Save each block when
          you’re done. Removing items does not rewrite existing books—those keep their stored IDs.
        </p>

        {taxonomyError ? (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {taxonomyError}
          </div>
        ) : null}

        {taxonomyLoading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-foreground/60">
            Loading catalog…
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            <div>
              <h3 className="text-sm font-semibold text-foreground/85">Categories</h3>
              <div className="mt-4">
                <CategoryTreeEditor
                  userId={user.uid}
                  initialMains={mainCategories}
                  onSaved={loadTaxonomy}
                />
              </div>
            </div>
            <div className="border-t border-white/10 pt-10">
              <h3 className="text-sm font-semibold text-foreground/85">Placement (rooms & shelves)</h3>
              <div className="mt-4">
                <PlacementTreeEditor
                  userId={user.uid}
                  initialRooms={placementRooms}
                  onSaved={loadTaxonomy}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="text-sm font-semibold text-foreground/90">Contact</div>
        <p className="mt-1 text-sm text-foreground/60">
          Opens your email app with support filled in as the recipient—write your message and send. We don’t
          display the address here.
        </p>
        <a
          href={contactMailtoHref()}
          className="mt-3 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-foreground/85 transition hover:border-white/15 hover:bg-white/10"
        >
          Email support
        </a>
      </section>

      <button
        type="button"
        onClick={doLogout}
        className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-foreground/85 transition hover:border-white/15 hover:bg-white/10"
      >
        Sign out
      </button>

      <div className="border-t border-white/5 pt-8">
        <DeleteAccountSection user={user} />
      </div>
    </div>
  );
}
