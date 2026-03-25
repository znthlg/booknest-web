"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

function firebaseAuthMessage(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/user-not-found":
      return "No account found for this email.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a moment.";
    default:
      return "";
  }
}

export default function Login() {
  const [mode, setMode] = useState(/** @type {"signin" | "signup"} */ ("signin"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (mode === "signup") {
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const msg = firebaseAuthMessage(err?.code) || err?.message || "Something went wrong.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isSignUp = mode === "signup";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
      <div className="mb-2">
        <div className="text-xs tracking-widest text-foreground/70">BOOKNEST</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isSignUp ? "Create account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          Your personal library, organized and always within reach.
        </p>
      </div>

      <div className="mt-5 flex rounded-xl border border-white/10 bg-white/[0.07] p-0.5">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError("");
            setConfirmPassword("");
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            !isSignUp
              ? "bg-indigo-500/90 text-white shadow-sm"
              : "text-foreground/60 hover:text-foreground/80"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError("");
            setConfirmPassword("");
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            isSignUp
              ? "bg-indigo-500/90 text-white shadow-sm"
              : "text-foreground/60 hover:text-foreground/80"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? 6 : undefined}
          />
          {isSignUp ? (
            <p className="mt-1 text-xs text-foreground/50">At least 6 characters.</p>
          ) : null}
        </div>

        {isSignUp ? (
          <div>
            <label
              className="mb-1 block text-sm font-medium text-foreground/80"
              htmlFor="confirm-password"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Continue"}
        </button>
      </form>
    </div>
  );
}

