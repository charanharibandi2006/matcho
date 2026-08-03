import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import {
  Bell,
  User,
  PlusCircle,
  Settings2,
  Users,
  CalendarRange,
  Trophy,
  Medal,
  Flame,
  CheckCircle2,
  HelpCircle,
  Radio,
} from "lucide-react";
import { useLiveMatch } from "../context/LiveMatchContext";
// import LiveTicker from "../components/LiveTicker";
import LiveScoreModal from "../components/LiveScoreModal";
import TournamentBracket from "../components/TournamentBracket";
import "./StatsDashboard.css";

const TILES = [
  {
    icon: PlusCircle,
    cls: "icon-purple",
    title: "Create tournament",
    desc: "Create a tournament in just a few steps",
    action: "/select-sport",
  },
  {
    icon: Settings2,
    cls: "icon-green",
    title: "Live Match Controller",
    desc: "Update points & scores for active matches live",
    action: "/score-update",
  },
  {
    icon: Users,
    cls: "icon-blue",
    title: "Manage Players",
    desc: "View registered players and teams",
    action: "players",
  },
  {
    icon: CalendarRange,
    cls: "icon-yellow",
    title: "Manage Fixtures",
    desc: "Schedule and manage tournament matches",
    action: "fixtures",
  },
];

function formatDateRange(start, end) {
  if (!start && !end) return "TBD";
  const opts = { day: "2-digit", month: "short" };
  const startLabel = start ? new Date(start).toLocaleDateString("en-GB", opts) : "TBD";
  const endLabel = end ? new Date(end).toLocaleDateString("en-GB", opts) : "TBD";
  return `${startLabel} - ${endLabel}`;
}

export default function OrganizerDashboardHome() {
  const navigate = useNavigate();
  const { matches, notifications, tournaments } = useLiveMatch();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const showBracket = true;

  const liveMatches = matches.filter((m) => m.status === "LIVE");

  const STATS = [
    { icon: Trophy, cls: "icon-purple", value: tournaments.length, label: "Total Tournaments" },
    { icon: Medal, cls: "icon-green", value: 256, label: "Total Players" },
    { icon: Flame, cls: "icon-orange", value: liveMatches.length, label: "Live Matches Now" },
    { icon: CheckCircle2, cls: "icon-blue", value: 42, label: "Matches Completed" },
  ];

  return (
    <div className="stat-shell">
      {/* Topbar */}
      <header className="stat-topbar">
        <img
          src={logo}
          alt="MATCHO"
          className="stat-logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        />
        <div className="stat-topbar-right">
          <button
            className="stat-icon-btn"
            title="Notifications"
            onClick={() => alert(`Notifications:\n${notifications.map((n) => `• ${n.text}`).join("\n")}`)}
          >
            <Bell size={20} />
          </button>
          <div className="stat-avatar" style={{ cursor: "pointer" }} onClick={() => navigate("/profile", { state: { role: "organizer" } })}>
            <User size={18} />
          </div>
          <span className="stat-username">Organizer Admin</span>
        </div>
      </header>

      {/* Real-time Ticker */}
      {/* <LiveTicker onSelectMatch={(m) => setSelectedMatch(m)} /> */}

      <main className="stat-main">
        <div className="dash-header-flex">
          <div>
            <h1>Organizer Dashboard</h1>
            <p>Real-time tournament management, live score controllers &amp; player rosters.</p>
          </div>
          <button className="stat-banner-btn primary" onClick={() => navigate("/select-sport", { state: { mode: "organizer" } })}>
            + Create Tournament
          </button>
        </div>

        {/* Welcome Banner */}
        <div className="stat-banner">
          <div>
            <h2>Welcome back, Organizer Admin!</h2>
            <p>You have <strong>{liveMatches.length} live matches</strong> running right now. Click any match to control live scores.</p>
            <button className="stat-banner-btn" onClick={() => navigate("/select-sport", { state: { mode: "organizer" } })}>
              + Launch New Event
            </button>
          </div>
          <div className="stat-banner-icon">🏆</div>
        </div>

        {/* Quick Action Tiles */}
        <div className="stat-tiles">
          {TILES.map(({ icon: Icon, cls, title, desc, action }) => (
            <div
              className="stat-tile"
              key={title}
              onClick={() => {
                if (action === "/select-sport") navigate(action, { state: { mode: "organizer" } });
                else if (action.startsWith("/")) navigate(action);
                else alert(`Opening ${title}...`);
              }}
            >
              <div className={`stat-card-icon ${cls}`}>
                <Icon size={20} />
              </div>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        {/* Real-time Live Match Scoring Controller Panel */}
        <div className="stat-panel" style={{ marginBottom: 24 }}>
          <div className="stat-panel-head">
            <div className="flex-head">
              <h4>Real-Time Live Match Scoring Controller</h4>
              <span className="live-pill-sm">
                <Radio size={12} className="live-pulsing-dot" /> {liveMatches.length} LIVE
              </span>
            </div>
            <span className="hint-txt">Click any match card to edit live points in real time</span>
          </div>

          <div className="live-matches-grid">
            {matches.map((m) => (
              <div
                key={m.id}
                className={`live-match-card ${m.status === "LIVE" ? "is-live" : ""}`}
                onClick={() => setSelectedMatch(m)}
              >
                <div className="live-card-top">
                  <span className="sport-tag">{m.sportIcon} {m.sportName}</span>
                  {m.status === "LIVE" ? (
                    <span className="live-badge-pulse">
                      <Radio size={10} className="live-pulsing-dot" /> SCORE CONTROLLER
                    </span>
                  ) : (
                    <span className="badge-green">{m.status}</span>
                  )}
                </div>

                <div className="live-card-body">
                  <div className="team-row">
                    <span className="team-n">{m.player1.name}</span>
                    <strong className="team-s">{m.player1.score}</strong>
                  </div>
                  <div className="team-row">
                    <span className="team-n">{m.player2.name}</span>
                    <strong className="team-s">{m.player2.score}</strong>
                  </div>
                </div>

                <div className="live-card-foot">
                  <span>{m.tournament} · {m.round}</span>
                  <span className="click-view">Update Points ⚡</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Bracket Section */}
        {showBracket && (
          <div style={{ marginBottom: 24 }}>
            <TournamentBracket title="Tournament Fixture Tree &amp; Live Progression" />
          </div>
        )}

        {/* Tournaments List & Stats Grid */}
        <div className="stat-panels two">
          <div className="stat-panel">
            <div className="stat-panel-head">
              <h4>Your Active Tournaments</h4>
              <a href="#!" onClick={(e) => e.preventDefault()}>View All ({STATS[0].value})</a>
            </div>
            <div className="stat-table-wrap">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>Tournament</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Players</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="stat-empty">
                        No tournaments yet. Click "+ Create Tournament" to launch your first one.
                      </td>
                    </tr>
                  ) : (
                    tournaments.slice(0, 6).map((t) => (
                      <tr key={t.id}>
                        <td>
                          <span
                            className="stat-table-thumb"
                            style={{ background: t.color }}
                          />
                          {t.name}
                        </td>
                        <td>{t.category}</td>
                        <td>{formatDateRange(t.startDate, t.endDate)}</td>
                        <td>{t.location}</td>
                        <td>
                          {t.status === "Ongoing" ? (
                            <span className="status-pill">Ongoing</span>
                          ) : t.status === "Upcoming" ? (
                            <span className="badge-blue">Upcoming</span>
                          ) : (
                            <span className="badge-green">{t.status}</span>
                          )}
                        </td>
                        <td>{t.participants}{t.maxParticipants ? ` / ${t.maxParticipants}` : ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="stat-panel">
            <div className="stat-panel-head">
              <h4>Tournament Key Metrics</h4>
            </div>
            <div className="stat-cards" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 0 }}>
              {STATS.map(({ icon: Icon, cls, value, label }) => (
                <div className="stat-card" key={label}>
                  <div className={`stat-card-icon ${cls}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3>{value}</h3>
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications & Support */}
        <div className="stat-panels two">
          <div className="stat-panel">
            <div className="stat-panel-head">
              <h4>Real-Time Match Notifications</h4>
            </div>
            <div className="notif-list">
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="stat-list-row">
                  <div className="stat-thumb icon-blue">
                    <CalendarRange size={16} />
                  </div>
                  <div>
                    <p className="stat-row-title">{n.text}</p>
                  </div>
                  <span className="stat-row-sub" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                    {n.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-panel">
            <div className="stat-panel-head">
              <h4>Quick Support &amp; Organizer Help</h4>
            </div>
            <div className="stat-footer-bar" style={{ margin: 0 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div className="stat-thumb icon-purple">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <strong>Need help with real-time scoring?</strong>
                  <p>Our match controller support team is available 24/7.</p>
                </div>
              </div>
            </div>
            <button
              className="stat-footer-btn"
              style={{ marginTop: 14 }}
              onClick={() => alert("Connecting to support team...")}
            >
              Contact Support →
            </button>
          </div>
        </div>
      </main>

      {/* Live Score Modal for Organizer Controller */}
      {selectedMatch && (
        <LiveScoreModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          isOrganizer={true}
        />
      )}
    </div>
  );
}
