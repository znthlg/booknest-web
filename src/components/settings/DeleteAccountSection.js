"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { deleteAllUserFirestoreData } from "@/lib/deleteUserData";

export default function DeleteAccountSection({ user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isEmailProvider =
    user?.providerData?.some((p) => p?.providerId === "password") ?? false;

  const runDelete = async () => {
    if (!user?.email || !isEmailProvider) return;
    const trimmed = password.trim();
    if (!trimmed) {
      setError("Enter your current password to confirm.");
      return;
    }

    if (
      !window.confirm(
        "Last step: your account and all library data will be permanently deleted. This cannot be undone. Continue?"
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const cred = EmailAuthProvider.credential(user.email, trimmed);
      await reauthenticateWithCredential(user, cred);
      await deleteAllUserFirestoreData(user.uid);
      await deleteUser(user);
      router.replace("/login");
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Incorrect password.");
      } else if (code === "auth/requires-recent-login") {
        setError("Please sign out and sign in again, then try deletion.");
      } else {
        setError(e?.message || "Could not delete account. Try again or contact support.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isEmailProvider) {
    return (
      <p className="text-center text-[11px] leading-relaxed text-foreground/40">
        Account deletion here works with email &amp; password sign-in only. For other sign-in methods,
        contact support.
      </p>
    );
  }

  return (
    <div className="text-center">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            if (
              !window.confirm(
                "Your Booknest account and all saved data will be permanently removed. This cannot be undone. Open the deletion form?"
              )
            ) {
              return;
            }
            setOpen(true);
            setError("");
            setPassword("");
          }}
          className="text-[11px] text-foreground/40 underline decoration-foreground/25 underline-offset-2 transition hover:text-rose-300/90 hover:decoration-rose-400/40"
        >
          Delete account
        </button>
      ) : (
        <div className="mx-auto max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-4 text-left">
          <p className="text-xs leading-relaxed text-foreground/70">
            This removes your Booknest account and <span className="text-foreground/85">all</span> stored
            data (books, categories, placement, settings). This action is permanent.
          </p>
          <label className="mt-3 block text-[11px] font-medium text-foreground/55">
            Current password (required to confirm)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={busy}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
          />
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={runDelete}
              className="rounded-xl bg-rose-600/90 px-3 py-2 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Permanently delete account"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setPassword("");
                setError("");
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground/70 hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
