import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Trophy,
  ClipboardList,
  Calendar,
  Flame,
  CheckCircle2,
  Radio,
  Lock,
  Check,
  Hourglass,
  Circle,
  Share2,
  Users,
  Edit,
  Download,
  MoreVertical,
  Search,
} from "lucide-react";
import DashboardSidebar from "../components/Scoreboardsidebar";
import { useLiveMatch } from "../context/LiveMatchContext";
import { setRole } from "../utils/auth";
import "./Dashboard.css";
import "./StatsDashboard.css";

const TABS = [
  { id: "all", label: "All" },
  { id: "Registration Open", label: "Registration Open" },
  { id: "Upcoming", label: "Upcoming" },
  { id: "Ongoing", label: "Ongoing" },
  { id: "Completed", label: "Completed" },
];

function formatDateRange(start, end) {
  if (!start && !end) return "TBD";
  const opts = { day: "2-digit", month: "short" };
  const startLabel = start ? new Date(start).toLocaleDateString("en-GB", opts) : "TBD";
  const endLabel = end ? new Date(end).toLocaleDateString("en-GB", opts) : "TBD";
  return `${startLabel} - ${endLabel}`;
}

function daysLeft(endDate) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

export default function OrganizerDashboardHome() {
  const navigate = useNavigate();
  const { matches, tournaments, notifications } = useLiveMatch();
  const [activeTab, setActiveTab] = useState("Registration Open");
  const [search, setSearch] = useState("");

  const liveMatches = matches.filter((m) => m.status === "LIVE");

  useEffect(() => {
    setRole("college-administrator");
  }, []);

  const stats = useMemo(() => ({
    total: tournaments.length,
    regOpen: tournaments.filter((t) => t.status === "Registration Open").length,
    upcoming: tournaments.filter((t) => t.status === "Upcoming").length,
    ongoing: tournaments.filter((t) => t.status === "Ongoing").length,
    completed: tournaments.filter((t) => t.status === "Completed").length,
  }), [tournaments]);

  const filteredTournaments = useMemo(() => {
    let list = tournaments;
    if (activeTab !== "all") list = list.filter((t) => t.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.sportName?.toLowerCase().includes(q));
    }
    return list;
  }, [tournaments, activeTab, search]);

  const STAT_CARDS = [
    { icon: Trophy, cls: "icon-purple", value: stats.total, label: "Total Tournaments", sub: "All time" },
    { icon: ClipboardList, cls: "icon-green", value: stats.regOpen, label: "Registration Open", sub: "Accepting registrations" },
    { icon: Calendar, cls: "icon-blue", value: stats.upcoming, label: "Upcoming", sub: "Starting soon" },
    { icon: Flame, cls: "icon-orange", value: stats.ongoing, label: "Ongoing", sub: "Live now" },
    { icon: CheckCircle2, cls: "icon-yellow", value: stats.completed, label: "Completed", sub: "Finished" },
  ];

  const handleLiveMatchClick = (match) => {
    navigate(`/live-scoring/${match.id}`);
  };

  return (
    <div className="org-layout">
      <DashboardSidebar activeItem="Dashboard" />

      <div className="org-main">
        <div className="org-content">
          {/* Header */}
          <div className="org-header">
            <div>
              <h1>Dashboard</h1>
              <p>Score can be seen in real-time during live matches.</p>
            </div>
            <div className="org-header-right">
              <button
                className="org-icon-btn"
                title="Notifications"
                onClick={() => alert(`Notifications:\n${notifications.map((n) => `• ${n.text}`).join("\n")}`)}
              >
                <Bell size={18} />
                <span className="org-notif-dot">3</span>
              </button>
              <div className="org-avatar-sm">C</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="org-stats-row">
            {STAT_CARDS.map(({ icon: Icon, cls, value, label, sub }) => (
              <div className="org-stat-card" key={label}>
                <div className={`org-stat-icon ${cls}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3>{value}</h3>
                  <span>{label}</span>
                  <small>{sub}</small>
                </div>
              </div>
            ))}
          </div>

          {/* Live matches - click to open full screen */}
          {liveMatches.length > 0 && (
            <div className="org-panel">
              <div className="org-panel-head">
                <h4>
                  Live Matches
                  <span className="live-pill-sm" style={{ marginLeft: 10 }}>
                    <Radio size={10} className="live-pulsing-dot" /> {liveMatches.length} LIVE
                  </span>
                </h4>
                <span style={{ fontSize: 12, color: "#8a8fa3" }}>Click a match to open full-screen scoring</span>
              </div>
              <div className="org-live-grid">
                {liveMatches.map((m) => (
                  <div
                    key={m.id}
                    className="org-live-card is-live"
                    onClick={() => handleLiveMatchClick(m)}
                  >
                    <div className="org-live-card-top">
                      <span className="sport-tag">{m.sportIcon} {m.sportName}</span>
                      <span className="live-badge-pulse">
                        <Radio size={10} className="live-pulsing-dot" /> LIVE
                      </span>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: 12, color: "#8a8fa3" }}>
                      {m.tournament} · {m.round}
                    </p>
                    <div className="org-live-scores">
                      <div>
                        <div className="org-live-score-big blue">{m.player1.score}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>
                          {m.player1.shortName || m.player1.name}
                        </div>
                      </div>
                      <span style={{ color: "#c8cad8", fontWeight: 700 }}>VS</span>
                      <div style={{ textAlign: "right" }}>
                        <div className="org-live-score-big pink">{m.player2.score}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#ec4899" }}>
                          {m.player2.shortName || m.player2.name}
                        </div>
                      </div>
                    </div>
                    <div className="org-live-card-foot">
                      <span>{m.court || m.field || "Court 1"}</span>
                      <span className="org-open-fullscreen">Open Full Screen →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Tournaments */}
          <div className="org-panel">
            <div className="org-panel-head">
              <h4>My Tournaments</h4>
              <div className="org-search-row">
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "#9aa0b4" }} />
                  <input
                    className="org-search-input"
                    style={{ paddingLeft: 32 }}
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="org-filter-btn">Filter</button>
              </div>
            </div>

            <div className="org-tabs">
              {TABS.map((tab) => {
                const count = tab.id === "all"
                  ? tournaments.length
                  : tournaments.filter((t) => t.status === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    className={`org-tab ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                    <span className="org-tab-count">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="stat-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Tournament</th>
                    <th>Sport</th>
                    <th>Registration Period</th>
                    <th>Teams</th>
                    <th>Status</th>
                    <th>Next Step</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTournaments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="stat-empty">
                        No tournaments found. Click "+ Create Tournament" to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredTournaments.map((t) => {
                      const left = daysLeft(t.regEnd);
                      return (
                        <tr key={t.id}>
                          <td>
                            <div className="org-table-tournament">{t.name}</div>
                            <div className="org-table-sub">{t.category} • {t.format}</div>
                          </td>
                          <td>{t.sportName?.toLowerCase()}</td>
                          <td>
                            {formatDateRange(t.regStart || t.startDate, t.regEnd || t.endDate)}
                            {left && t.status === "Registration Open" && (
                              <div className="org-days-left">{left} days left</div>
                            )}
                          </td>
                          <td>{t.participants} / {t.maxParticipants}</td>
                          <td>
                            {t.status === "Registration Open" ? (
                              <span className="org-status-open">Registration Open</span>
                            ) : t.status === "Ongoing" ? (
                              <span className="status-pill">Ongoing</span>
                            ) : t.status === "Upcoming" ? (
                              <span className="badge-blue">Upcoming</span>
                            ) : (
                              <span className="badge-green">{t.status}</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: "#8a8fa3" }}>
                            {t.status === "Registration Open" && left
                              ? `Registrations closing in ${left} Days`
                              : t.status === "Ongoing"
                                ? "Manage live matches"
                                : t.status === "Upcoming"
                                  ? "Prepare registrations"
                                  : "View results"}
                          </td>
                          <td>
                            <button className="org-view-btn">View</button>
                            <button className="org-view-btn" style={{ marginLeft: 4, padding: "6px 8px" }}>
                              <MoreVertical size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <a className="org-view-all" onClick={() => setActiveTab("all")}>
              View All Tournaments →
            </a>
          </div>

          {/* Bottom 3-column section */}
          <div className="org-bottom-grid">
            {/* ==================================
    TOURNAMENT SETUP
================================== */}

<div className="org-panel org-setup-card">

  <h5>
    Tournament Setup
  </h5>


  {/* TEAM SETUP */}

  <div className="org-setup-step">

    <strong>
      1. Team Setup
    </strong>

    <div className="org-setup-btns">

      <button
        type="button"
        className="primary"
        disabled={
          !selectedTournament ||
          selectedTournament.status ===
            "Registration Open"
        }
        onClick={() =>
          handleTeamSetup(
            "autoGenerate"
          )
        }
      >
        Auto Generate
      </button>


      <button
        type="button"
        disabled={
          !selectedTournament ||
          selectedTournament.status ===
            "Registration Open"
        }
        onClick={() =>
          handleTeamSetup(
            "manual"
          )
        }
      >
        Create Manually
      </button>

    </div>

  </div>


  {/* FIXTURE SETUP */}

  <div className="org-setup-step">

    <strong>
      2. Fixture Setup
    </strong>

    <div className="org-setup-btns">

      <button
        type="button"
        className="primary"
        disabled={
          !selectedTournament ||
          selectedTournament.status ===
            "Registration Open"
        }
        onClick={() =>
          handleFixtureSetup(
            "autoGenerate"
          )
        }
      >
        Auto Generate
      </button>


      <button
        type="button"
        disabled={
          !selectedTournament ||
          selectedTournament.status ===
            "Registration Open"
        }
        onClick={() =>
          handleFixtureSetup(
            "manual"
          )
        }
      >
        Create Manually
      </button>

    </div>

  </div>


  {/* STATUS MESSAGE */}

  <div
    className={
      selectedTournament?.status ===
      "Registration Open"
        ? "org-locked-banner"
        : "org-setup-ready-banner"
    }
  >

    <Lock size={14} />

    {selectedTournament?.status ===
    "Registration Open"
      ? "Registrations must be closed to access setup"
      : "Registration is closed. Tournament setup is available."}

  </div>

</div>

            <div className="org-panel">
              <h5 style={{ margin: "0 0 14px", fontSize: 14 }}>Tournament Progress</h5>
              <ul className="org-progress-list">
                <li className="org-progress-item">
                  <span className="org-progress-dot done"><Check size={12} /></span>
                  Tournament Created
                </li>
                <li className="org-progress-item">
                  <span className="org-progress-dot done"><Check size={12} /></span>
                  Registration Open
                </li>
                <li className="org-progress-item">
                  <span className="org-progress-dot active"><Hourglass size={12} /></span>
                  Registration Closed
                </li>
                <li className="org-progress-item">
                  <span className="org-progress-dot pending"><Circle size={10} /></span>
                  Setup Pending
                </li>
                <li className="org-progress-item">
                  <span className="org-progress-dot pending"><Circle size={10} /></span>
                  Ready to Start
                </li>
              </ul>
            </div>

            <div className="org-panel">
              <h5 style={{ margin: "0 0 14px", fontSize: 14 }}>Quick Actions</h5>
              <div className="org-quick-action" onClick={() => alert("Registration link copied!")}>
                <Share2 size={16} /> Share Registration Link
              </div>
              <div className="org-quick-action" onClick={() => alert("Opening registrations...")}>
                <Users size={16} /> View Registrations
              </div>
              <div className="org-quick-action" onClick={() => navigate("/select-sport", { state: { mode: "organizer" } })}>
                <Edit size={16} /> Edit Tournament
              </div>
              <div className="org-quick-action" onClick={() => alert("Downloading flyer...")}>
                <Download size={16} /> Download Flyer
              </div>
              <div className="org-note-box">
                <strong>Important Note</strong>
                Team and fixture setup is only available after the registration deadline has passed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
