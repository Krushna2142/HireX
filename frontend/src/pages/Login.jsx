import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { user, loginWithGoogle } = useAuth();

  if (user) return <p>You are logged in as {user.displayName}</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <button
        onClick={loginWithGoogle} // ✅ Calls the hook
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Sign in with Google
      </button>
    </div>
  );
}
