import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import { Link } from "react-router-dom";

import logo from "../assets/images/logo.png";

import {
  LayoutDashboard,
  CalendarRange,
  BarChart3,
   Trophy,
  ShieldCheck,
} from "lucide-react";

import "./Sidebar.css";


// =========================================================
// NAV ITEMS
// =========================================================

function buildNavItems(dashboardPath) {
  return [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: dashboardPath,
      section: null,
    },
    {
      icon: CalendarRange,
      label: "Fixtures",
      path: "/scoreboard?section=fixtures",
      section: "fixtures",
    },
    {
      icon: BarChart3,
      label: "Standings",
      path: "/scoreboard?section=standings",
      section: "standings",
    },
  ];
}

// =========================================================
// COMPONENT
// =========================================================

export default function Scoreboardsidebar() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  // =======================================================
  // LOGGED-IN USER
  // =======================================================

  const storedUser =
    localStorage.getItem(
      "matcho_user"
    );

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
    "Score Viewer";

  const userRole =
    currentUser?.role ||
    "Viewer";

  const userInitial =
    userName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "V";

  // =======================================================
  // DASHBOARD PATH
  // =======================================================

  const dashboardPath = "/";

  const NAV_ITEMS =
    buildNavItems(
      dashboardPath
    );

  // =======================================================
  // CURRENT SECTION
  // =======================================================

  const currentSection =
    new URLSearchParams(
      location.search
    ).get("section");

  // =======================================================
  // ACTIVE ITEM
  //
  // IMPORTANT:
  // Do NOT force Dashboard active using a prop.
  // The URL decides which navigation item is active.
  // =======================================================

  const isActive = (item) => {
    // Dashboard
    if (
      item.section === null &&
      location.pathname ===
        "/scoreboard" &&
      !currentSection
    ) {
      return true;
    }

    // Fixtures / Standings
    if (
      item.section &&
      location.pathname ===
        "/scoreboard" &&
      currentSection ===
        item.section
    ) {
      return true;
    }

    return false;
  };

  // =======================================================
  // NAVIGATION
  // =======================================================

  const handleNav = (item) => {
    navigate(item.path);
  };

  // =======================================================
  // PUBLIC ACTIONS
  // =======================================================

  const handleJoin = () => navigate("/join-tournament");
  const handleOrganizer = () => navigate("/signup");

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <aside className="org-sidebar">

      {/* =================================================
          LOGO
      ================================================= */}

      <Link
        to="/"
        className="org-sidebar-logo"
      >
        <img
          src={logo}
          alt="MATCHO"
        />
      </Link>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav className="org-sidebar-nav">

        {NAV_ITEMS.map(
          (item) => {
            const Icon =
              item.icon;

            const active =
              isActive(item);

            return (
              <button
                key={
                  item.label
                }
                type="button"
                className={`org-nav-item ${
                  active
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleNav(item)
                }
              >
                <Icon
                  size={18}
                />

                <span>
                  {item.label}
                </span>
              </button>
            );
          }
        )}

      </nav>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="org-sidebar-footer">

        {/* PUBLIC ACTIONS */}

<div className="org-sidebar-public-actions">

  {/* JOIN TOURNAMENT */}

  <button
    type="button"
    className="public-action-card public-action-primary"
    onClick={handleJoin}
  >
    <span className="public-action-icon">
      <Trophy size={18} />
    </span>

    <span className="public-action-content">
      <span className="public-action-title">
        Join Tournament
      </span>

      <span className="public-action-subtitle">
        Find and join an event
      </span>
    </span>
  </button>


  {/* ORGANIZER */}

  <button
    type="button"
    className="public-action-card public-action-secondary"
    onClick={handleOrganizer}
  >
    <span className="public-action-icon">
      <ShieldCheck size={18} />
    </span>

    <span className="public-action-content">
      <span className="public-action-title">
        Organizer
      </span>

      <span className="public-action-subtitle">
        Create & manage tournaments
      </span>
    </span>
  </button>

</div>


      </div>

    </aside>
  );
}