"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard/shelf" : "/login");
  }, [loading, router, user]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-foreground/70">Loading...</div>
    </div>
  );
}