"use client";

import { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAccountDoc, saveAccountDoc } from "@/lib/accountSettingsApi";

function parseDisplayName(displayName) {
  const s = (displayName || "").trim();
  if (!s) return { firstName: "", lastName: "" };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export default function AccountProfileSection({ user, userId }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMessage, setPwdMessage] = useState("");
  const [pwdError, setPwdError] = useState("");

  const [resetBusy, setResetBusy] = useState(false);

  const isEmailProvider =
    user?.providerData?.some((p) => p?.providerId === "password") ?? false;

  useEffect(() => {
    const run = async () => {
      if (!userId) return;
      setLoadingDoc(true);
      try {
        const acc = await getAccountDoc(userId);
        const fromDoc =
          acc?.firstName != null || acc?.lastName != null
            ? {
                firstName: (acc.firstName || "").toString(),
                lastName: (acc.lastName || "").toString(),
              }
            : parseDisplayName(user?.displayName);
        setFirstName(fromDoc.firstName);
        setLastName(fromDoc.lastName);
        setPhotoUrl((user?.photoURL || "").toString());
      } catch {
        const p = parseDisplayName(user?.displayName);
        setFirstName(p.firstName);
        setLastName(p.lastName);
        setPhotoUrl((user?.photoURL || "").toString());
      } finally {
        setLoadingDoc(false);
      }
    };
    run();
  }, [userId, user?.displayName, user?.photoURL]);

  const saveProfile = async () => {
    if (!user || !userId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const fn = firstName.trim();
      const ln = lastName.trim();
      const display = [fn, ln].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Reader";
      const photo = photoUrl.trim();
      await saveAccountDoc(userId, { firstName: fn, lastName: ln });
      await updateProfile(user, {
        displayName: display,
        ...(photo ? { photoURL: photo } : { photoURL: null }),
      });
      setMessage("Profile updated.");
    } catch (e) {
      setError(e?.message || "Could not update profile.");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!user?.email || !isEmailProvider) return;
    setPwdError("");
    setPwdMessage("");
    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirmation do not match.");
      return;
    }
    setPwdBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdMessage("Password updated.");
    } catch (e) {
      setPwdError(e?.message || "Could not change password.");
    } finally {
      setPwdBusy(false);
    }
  };

  const sendReset = async () => {
    if (!user?.email) return;
    setResetBusy(true);
    setPwdError("");
    setPwdMessage("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPwdMessage("Check your email for a password reset link.");
    } catch (e) {
      setPwdError(e?.message || "Could not send reset email.");
    } finally {
      setResetBusy(false);
    }
  };

  if (loadingDoc) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-foreground/60">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2 sm:w-40">
          <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-white/15 bg-white/10 shadow-lg">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-foreground/40">
                {(firstName || user?.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <p className="text-center text-[10px] text-foreground/45">Preview</p>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                autoComplete="family-name"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">
              Profile photo URL
            </label>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              type="url"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              placeholder="https://…"
            />
            <p className="mt-1 text-[11px] text-foreground/45">
              Paste a direct image link. Firebase Auth updates your photo for this app.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-foreground/55">
            Email <span className="text-foreground/80">{user?.email}</span> — sign-in address (read only).
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300/90">{message}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={saveProfile}
        className="w-full rounded-2xl bg-indigo-500 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {busy ? "Saving…" : "Save profile"}
      </button>

      <div className="border-t border-white/10 pt-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
          Password
        </div>
        {isEmailProvider ? (
          <>
            <form onSubmit={changePassword} className="mt-3 grid gap-3 sm:max-w-md">
              <div>
                <label className="mb-1 block text-xs text-foreground/65">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-foreground/65">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-foreground/65">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  autoComplete="new-password"
                />
              </div>
              {pwdError ? <p className="text-sm text-rose-300">{pwdError}</p> : null}
              {pwdMessage ? <p className="text-sm text-emerald-300/90">{pwdMessage}</p> : null}
              <button
                type="submit"
                disabled={pwdBusy}
                className="rounded-xl border border-white/15 bg-white/5 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
              >
                {pwdBusy ? "Updating…" : "Update password"}
              </button>
            </form>
            <div className="mt-4">
              <button
                type="button"
                disabled={resetBusy}
                onClick={sendReset}
                className="text-sm text-indigo-300/90 hover:text-indigo-200 disabled:opacity-50"
              >
                {resetBusy ? "Sending…" : "Email me a reset link instead"}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-foreground/55">
            You signed in with a provider other than email/password. Use that provider to manage your
            password, or link an email login in the Firebase console.
          </p>
        )}
      </div>
    </div>
  );
}
