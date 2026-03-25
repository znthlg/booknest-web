"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { ensureCategoryCatalogSeeded } from "@/lib/categoryCatalog/seedCategoryCatalog";
import { ensurePlacementCatalogSeeded } from "@/lib/placementCatalog/seedPlacementCatalog";
import { ensureDefaultWebTaxonomy } from "@/lib/ensureDefaultTaxonomy";
import { useAuth } from "@/lib/useAuth";

const tabs = [
  { key: "shelf", href: "/dashboard/shelf", label: "Shelf" },
  { key: "books", href: "/dashboard/books", label: "Books" },
  { key: "authors", href: "/dashboard/authors", label: "Authors" },
  { key: "settings", href: "/dashboard/settings", label: "Settings" },
];

function isActive(pathname, href) {
  if (pathname === href) return true;
  if (href === "/dashboard/books" && pathname.startsWith("/dashboard/library")) return true;
  return pathname.startsWith(href + "/");
}

function Icon({ name }) {
  // Small inline SVGs (no dependency).
  const common = "h-5 w-5";
  if (name === "shelf") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h18" />
        <path d="M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
        <path d="M8 7V4h8v3" />
        <path d="M8 12h8" />
      </svg>
    );
  }
  if (name === "books") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 0 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    );
  }
  if (name === "authors") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-1.4 3.4h-.2a1.7 1.7 0 0 0-1.7 1.3l-.1.2a2 2 0 0 1-3.9 0l-.1-.2a1.7 1.7 0 0 0-1.7-1.3h-.2a2 2 0 0 1-1.4-3.4l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.2-1.1l-.2-.1a2 2 0 0 1 0-3.9l.2-.1a1.7 1.7 0 0 0 1.2-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 1.4-3.4h.2a1.7 1.7 0 0 0 1.7-1.3l.1-.2a2 2 0 0 1 3.9 0l.1.2a1.7 1.7 0 0 0 1.7 1.3h.2a2 2 0 0 1 1.4 3.4l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.2 1.1l.2.1a2 2 0 0 1 0 3.9l-.2.1a1.7 1.7 0 0 0-1.2 1.1Z" />
    </svg>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      await ensureDefaultWebTaxonomy(user.uid);
      await ensureCategoryCatalogSeeded(user.uid);
      await ensurePlacementCatalogSeeded(user.uid);
    })().catch(() => {});
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-foreground/70">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const onLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const pageTitle = pathname
    .replace("/dashboard/", "")
    .replace("-", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

  const isShelf =
    pathname === "/dashboard/shelf" || pathname.startsWith("/dashboard/shelf/");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-white/10 bg-white/5 px-3 py-4 md:flex">
        <div className="px-1">
          <div className="text-xs tracking-widest text-foreground/70">BOOKNEST</div>
          <div className="mt-1 text-lg font-semibold tracking-tight">Your library</div>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {tabs.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                    : "border border-transparent text-foreground/80 hover:border-white/10 hover:bg-white/5"
                }`}
              >
                <span className={active ? "text-indigo-300" : "text-foreground/70"}>
                  <Icon name={item.key} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-foreground/60">Signed in as</div>
            <div className="mt-1 truncate text-xs font-medium text-foreground/90">{user.email}</div>
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground/85 transition hover:border-white/15 hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[var(--background)]/95 px-4 backdrop-blur-md md:hidden">
        <Link
          href="/dashboard/shelf"
          className="min-w-0 text-sm font-semibold tracking-tight text-foreground/95"
        >
          BookNest
        </Link>
        <Link
          href="/dashboard/books/new"
          className="shrink-0 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-400"
        >
          Add book
        </Link>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <section className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 md:px-8 md:py-6">
          <div
            className={`flex flex-wrap items-start gap-3 sm:items-center sm:gap-4 ${
              isShelf ? "justify-end" : "justify-between"
            }`}
          >
            {isShelf ? null : (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold tracking-tight sm:text-base">
                  {pageTitle}
                </div>
                <div className="mt-0.5 hidden text-sm text-foreground/60 sm:block">
                  Organized by your categories, locations, and reading status.
                </div>
              </div>
            )}

            <Link
              href="/dashboard/books/new"
              className="hidden shrink-0 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 md:inline-flex"
            >
              Add Book
            </Link>
          </div>

          <div className="mt-4 md:mt-6">{children}</div>
        </section>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 bg-[var(--background)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-0 px-1 pt-1">
          {tabs.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-t-xl px-1 py-1.5 text-[10px] font-medium tabular-nums transition ${
                  active
                    ? "bg-indigo-500/12 text-indigo-200"
                    : "text-foreground/70 active:bg-white/5"
                }`}
              >
                <span className={active ? "text-indigo-300" : "text-foreground/70"}>
                  <Icon name={item.key} />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

