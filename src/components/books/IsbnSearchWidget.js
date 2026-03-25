"use client";

import { useState } from "react";

function normalizeIsbnDigits(raw) {
  return (raw || "").toString().trim().replace(/[-\s]/g, "");
}

/**
 * Controlled ISBN field + search. Parent owns `isbn` / `onIsbnChange` for Firestore persistence.
 * On success, calls onResult({ ...apiJson, isbn: cleaned }) so parent can save the looked-up ISBN.
 */
export default function IsbnSearchWidget({ isbn, onIsbnChange, onResult, onError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    const cleaned = normalizeIsbnDigits(isbn);
    setError("");
    onError?.(null);

    if (!cleaned) {
      setError("Enter an ISBN first.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/isbn-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: cleaned }),
      });

      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg = data?.error || "ISBN not found.";
        setError(msg);
        onError?.(msg);
        return;
      }

      onIsbnChange?.(cleaned);
      onResult?.({ ...data, isbn: cleaned });
    } catch (err) {
      const msg = err?.message || "ISBN search failed.";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-end justify-between gap-4">
        <div className="w-full">
          <label className="mb-1 block text-sm font-medium text-foreground/80">
            ISBN
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 9780132350884"
            value={isbn}
            onChange={(e) => onIsbnChange?.(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
          />
        </div>

        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="whitespace-nowrap rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error ? <p className="mt-2 text-sm text-rose-200">{error}</p> : null}
      <p className="mt-2 text-xs text-foreground/60">
        Search will auto-fill title, author(s), language, publisher (when sources list it), and cover
        (when available).
      </p>
    </div>
  );
}

