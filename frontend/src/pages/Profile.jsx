import React from "react";
import { useAuth } from "../hooks/useAuth"; // ✅ Correct import

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) {
    return <p className="p-4 text-center">Please log in to view your profile.</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm text-center">
        <img
          src={user.photoURL}
          alt={user.displayName}
          className="w-24 h-24 rounded-full mx-auto mb-4"
        />
        <h2 className="text-xl font-bold">{user.displayName}</h2>
        <p className="text-gray-500">{user.email}</p>
        <button
          onClick={logout}
          className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
