import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.png";

import {
  LayoutDashboard,
  Trophy,
  HelpCircle,
  LogOut,
} from "lucide-react";

import "./Sidebar.css";

const NAV_ITEMS = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/player-dashboard",
  },
  {
    icon: Trophy,
    label: "Tournaments",
    path: "/player-tournaments",
  },
];

export default function PlayerSidebar({
  activeItem = "Dashboard",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================
  // LOGGED-IN USER
  // ==========================================

  const storedUser =
    localStorage.getItem("matcho_user");

  let currentUser = null;

  try {
    currentUser = storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch (error) {
    console.error(
      "Unable to parse matcho_user:",
      error
    );
  }

  const userName =
    currentUser?.name ||
    currentUser?.full_name ||
    "Player";

  const userRole =
    currentUser?.role ||
    "Player";

  const userInitial =
    userName.charAt(0).toUpperCase();

  // ==========================================
  // NAVIGATION
  // ==========================================

  const handleNav = (item) => {
    navigate(item.path);
  };

  const isActive = (item) => {
    if (item.label === activeItem) {
      return true;
    }

    if (
      item.path === "/player-tournaments" &&
      location.pathname.startsWith(
        "/player-tournaments"
      )
    ) {
      return true;
    }

    if (
      item.path === "/player-dashboard" &&
      location.pathname ===
        "/player-dashboard"
    ) {
      return true;
    }

    return false;
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem(
      "matcho_user"
    );

    localStorage.removeItem(
      "matcho_token"
    );

    navigate("/signin");
  };

  return (
    <aside className="org-sidebar">

      {/* LOGO */}

      <Link
        to="/player-dashboard"
        className="org-sidebar-logo"
      >
        <img
          src={logo}
          alt="Matcho"
        />
      </Link>

      {/* NAVIGATION */}

      <nav className="org-sidebar-nav">

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={`org-nav-item ${
                isActive(item)
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleNav(item)
              }
            >
              <Icon size={18} />

              <span>
                {item.label}
              </span>
            </button>
          );
        })}

      </nav>

      {/* FOOTER */}

      <div className="org-sidebar-footer">

        {/* USER */}

        <div className="org-user-card">

          <div className="org-user-avatar">
            {userInitial}
          </div>

          <div>
            <strong>
              {userName}
            </strong>

            <span>
              {userRole}
            </span>
          </div>

        </div>

        {/* LOGOUT */}

        <button
          type="button"
          className="org-nav-item logout-item player-logout"
          onClick={handleLogout}
        >
          <LogOut size={18} />

          <span>
            Logout
          </span>
        </button>

        {/* HELP */}

        <div className="org-help-box">
          <HelpCircle size={16} />

          <div>
            <strong>
              Need Help?
            </strong>

            <p>
              Contact our support team
            </p>
          </div>
        </div>

        {/* SUPPORT */}

        <button
          type="button"
          className="org-support-btn"
          onClick={() =>
            alert(
              "Connecting to support..."
            )
          }
        >
          Contact Support
        </button>

      </div>
    </aside>
  );
}