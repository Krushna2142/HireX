import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const { user, loginWithGoogle, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold text-blue-600">
        AI ResumePro
      </Link>
      <div className="space-x-4 flex items-center">
        <Link to="/dashboard" className="hover:text-blue-500">Dashboard</Link>
        <Link to="/resume-upload" className="hover:text-blue-500">Upload</Link>
        <Link to="/job-recommendations" className="hover:text-blue-500">Jobs</Link>
        {user ? (
          <>
            <Link to="/profile">
              <img src={user.photoURL} alt="profile" className="w-8 h-8 rounded-full" />
            </Link>
            <button onClick={logout} className="bg-red-500 text-white px-3 py-1 rounded">
              Logout
            </button>
          </>
        ) : (
          <button onClick={loginWithGoogle} className="bg-blue-500 text-white px-3 py-1 rounded">
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
