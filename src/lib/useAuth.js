"use client";

import { useEffect, useState } from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = null;

    // Ensure the login state is persisted across refreshes.
    setPersistence(auth, browserLocalPersistence).catch(() => {
      // If persistence fails (e.g. browser restrictions), auth still works.
    });

    unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  return { user, loading };
}

