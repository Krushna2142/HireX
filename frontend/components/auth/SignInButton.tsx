"use client";

import { useAuth } from "@/components/user-auth-provider";
import { Loader2, LogIn } from "lucide-react";

export default function SignInButton() {
  const { user, loading, signIn, logout } = useAuth();

  if (loading) {
    return (
      <button
        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm opacity-70"
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <button
        onClick={logout}
        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
      >
        <img
          src={user.photo ?? ""}
          alt="avatar"
          className="h-5 w-5 rounded-full"
        />
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={signIn}
      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
    >
      <LogIn className="h-4 w-4" />
      Sign in
    </button>
  );
}
