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
    path: "/organizer-dashboard",
  },
  {
    icon: Trophy,
    label: "Tournaments",
    path: "/tournament-management",
  },
];

export default function OrganizerSidebar({
  activeItem = "Dashboard",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the currently logged-in user
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
    currentUser = null;
  }

  const userName =
    currentUser?.name || "User";

  const userRole =
    currentUser?.role || "Organizer";

  const userInitial =
    userName.charAt(0).toUpperCase();

  const handleNav = (item) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  const isActive = (item) => {
    // Explicit active item
    if (item.label === activeItem) {
      return true;
    }

    // Keep Tournaments active on tournament-management pages
    if (
      item.path === "/tournament-management" &&
      location.pathname.startsWith(
        "/tournament-management"
      )
    ) {
      return true;
    }

    return false;
  };

 const handleLogout = () => {
  // Remove saved login information
  localStorage.removeItem("matcho_user");
  localStorage.removeItem("matcho_token");

  // Go to the public Matcho dashboard
  // and remove the organizer page from this history position.
  navigate("/", { replace: true });
};

  return (
    <aside className="org-sidebar">
      {/* Logo */}
      <Link
        to="/organizer-dashboard"
        className="org-sidebar-logo"
      >
        <img
          src={logo}
          alt="Matcho"
        />
      </Link>

      {/* Navigation */}
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

              {item.badge && (
                <span className="org-nav-badge">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="org-sidebar-footer">

        {/* Logged-in user */}
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

        {/* Logout */}
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

        {/* Help */}
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

        {/* Support */}
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