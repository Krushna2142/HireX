"use client";

import { useAuth } from "@/components/providers/AuthProvider"; // Import useAuth from the correct path
import { Loader2, LogIn } from "lucide-react";

export default function SignInButton() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth(); // Corrected to use signOutUser

  if (loading) {
    return (
      <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <button
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md hover:bg-gray-200"
        onClick={async () => {
          await signOutUser(); // Corrected to use signOutUser
        }}
      >
        <LogIn className="w-4 h-4" />
        Sign Out
      </button>
    );
  }

  return (
    <button
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-100 bg-blue-500 rounded-md hover:bg-blue-600"
      onClick={async () => {
        await signInWithGoogle(); // Sign user in with Google
      }}
    >
      <LogIn className="w-4 h-4" />
      Sign In with Google
    </button>
  );
}