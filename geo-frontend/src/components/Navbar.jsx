import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUser, logout } from "../utils/auth";
// import useAuth from "../auth/useAuth";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const getDisplayName = (u) =>
    u?.name || u?.email?.split("@")[0] || `User-${u?.userId?.slice(-6)}`;

  const menuClass = (path) =>
    `px-5 py-2 rounded-lg text-lg font-medium transition
     ${
       location.pathname === path
         ? "bg-white/30 text-white shadow-inner"
         : "hover:bg-white/20"
     }`;

  return (
    <nav className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center">
        {/* Logo */}
        <h1 className="font-bold text-xl whitespace-nowrap">GeoInsight</h1>

        {/* Push everything to the right */}
        <div className="ml-auto flex items-center gap-6">
          {/* Menu */}
          <div className="flex items-center gap-4">
            <Link to="/" className={menuClass("/")}>
              Dashboard
            </Link>

            <Link to="/records" className={menuClass("/records")}>
              Records
            </Link>
          </div>

          {/* User */}
          <span className="text-base opacity-95">
            Welcome, <b>{getDisplayName(user)}</b>
          </span>

          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-base font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
