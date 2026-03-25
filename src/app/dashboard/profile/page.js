"use client";

import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const onLogout = async () => {
    await signOut(auth);
    router.replace("/login");
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
    <div>
      <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-medium text-foreground/85">Profile</div>
        <div className="mt-2 text-sm text-foreground/60">
          Account details for your BookNest space.
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-foreground/60">Email</div>
            <div className="mt-1 text-sm font-medium text-foreground/90">
              {user.email}
            </div>
          </div>
          <div>
            <div className="text-xs text-foreground/60">User ID</div>
            <div className="mt-1 text-sm font-medium text-foreground/90">
              {user.uid}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-foreground/85 hover:bg-white/10 hover:border-white/15 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

