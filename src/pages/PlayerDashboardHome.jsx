import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import {
  Bell,
  User,
  Trophy,
  Swords,
  Target,
  Medal,
  Award,
  Flame,
  RotateCcw,
  BellRing,
  Radio,
} from "lucide-react";
import { useLiveMatch } from "../context/LiveMatchContext";
// import LiveTicker from "../components/LiveTicker";
import LiveScoreModal from "../components/LiveScoreModal";
import TournamentBracket from "../components/TournamentBracket";
import "./StatsDashboard.css";

const STATS = [
  { icon: Trophy, cls: "icon-purple", value: 12, label: "Total Tournaments", title: "Tournaments Played" },
  { icon: Swords, cls: "icon-green", value: 42, label: "Total Matches", title: "Matches Played" },
  { icon: Target, cls: "icon-blue", value: "68.7%", label: "29 Wins / 13 Losses", title: "Win Rate" },
  { icon: Medal, cls: "icon-yellow", value: "2nd", label: "City Badminton League 2025", title: "Best Position" },
];

const ACHIEVEMENTS = [
  { icon: Trophy, title: "Tournament Winner", sub: "3 Times" },
  { icon: Award, title: "Top 4 Finishes", sub: "5 Times" },
  { icon: Flame, title: "Win Streak", sub: "5 Matches" },
  { icon: RotateCcw, title: "MVP Points", sub: "1,420 Pts" },
];

export default function PlayerDashboardHome() {
  const navigate = useNavigate();
  const { matches } = useLiveMatch();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const liveCount = matches.filter((m) => m.status === "LIVE").length;

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
            onClick={() => alert("Notification: You have 2 upcoming matches scheduled today!")}
          >
            <Bell size={20} />
          </button>
          <div className="stat-avatar" style={{ cursor: "pointer" }} onClick={() => navigate("/profile", { state: { role: "player" } })}>
            <User size={18} />
          </div>
          <span className="stat-username">Alex Player</span>
        </div>
      </header>

      {/* Real-time Ticker Bar */}
      {/* <LiveTicker onSelectMatch={(m) => setSelectedMatch(m)} /> */}

      <main className="stat-main">
        <div className="dash-header-flex">
          <div>
            <h1>Player Dashboard</h1>
            <p>Track your real-time matches, stats, and tournament brackets.</p>
          </div>
          <button className="stat-banner-btn primary" onClick={() => navigate("/select-sport")}>
            + Join New Tournament
          </button>
        </div>

        {/* Welcome Banner */}
        <div className="stat-banner">
          <div>
            <h2>Welcome back, Alex!</h2>
            <p>You have <strong>{liveCount} matches</strong> currently playing LIVE across your tournaments.</p>
            <button className="stat-banner-btn" onClick={() => navigate("/select-sport")}>
              Browse All Tournaments →
            </button>
          </div>
          <div className="stat-banner-icon">🏸</div>
        </div>

        {/* Stats Grid */}
        <div className="stat-cards">
          {STATS.map(({ icon: Icon, cls, value, label, title }) => (
            <div className="stat-card" key={title}>
              <div className={`stat-card-icon ${cls}`}>
                <Icon size={20} />
              </div>
              <div>
                <h3>{value}</h3>
                <span>{title}</span>
                <br />
                <span style={{ color: "#8a8fa3" }}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Real-Time Live & Recent Matches Section */}
        <div className="stat-panel" style={{ marginBottom: 24 }}>
          <div className="stat-panel-head">
            <div className="flex-head">
              <h4>Real-Time Live &amp; Upcoming Matches</h4>
              {liveCount > 0 && (
                <span className="live-pill-sm">
                  <Radio size={12} className="live-pulsing-dot" /> {liveCount} LIVE NOW
                </span>
              )}
            </div>
            <div className="filter-tabs-sm">
              <button
                className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All
              </button>
              <button
                className={`tab-btn ${activeTab === "live" ? "active" : ""}`}
                onClick={() => setActiveTab("live")}
              >
                Live
              </button>
            </div>
          </div>

          <div className="live-matches-grid">
            {matches
              .filter((m) => activeTab === "all" || m.status.toLowerCase() === activeTab)
              .map((m) => (
                <div
                  key={m.id}
                  className={`live-match-card ${m.status === "LIVE" ? "is-live" : ""}`}
                  onClick={() => setSelectedMatch(m)}
                >
                  <div className="live-card-top">
                    <span className="sport-tag">{m.sportIcon} {m.sportName}</span>
                    {m.status === "LIVE" ? (
                      <span className="live-badge-pulse">
                        <Radio size={10} className="live-pulsing-dot" /> LIVE
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
                    <span>{m.tournament}</span>
                    <span className="click-view">Click for score details →</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Visual Interactive Tournament Bracket */}
        <div style={{ marginBottom: 24 }}>
          <TournamentBracket title="My Active Tournament Bracket" />
        </div>

        {/* Performance & Achievements Panels */}
        <div className="stat-panels two">
          <div className="stat-panel">
            <div className="stat-panel-head">
              <h4>Achievements &amp; Badges</h4>
            </div>
            <div className="stat-achievements">
              {ACHIEVEMENTS.map(({ icon: Icon, title, sub }, i) => (
                <div className="stat-achievement" key={i}>
                  <div className="stat-thumb icon-purple">
                    <Icon size={16} />
                  </div>
                  <strong>{title}</strong>
                  <span>{sub}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-panel">
            <div className="stat-panel-head">
              <h4>Tournament Position History</h4>
            </div>
            <div className="stat-table-wrap">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>Tournament</th>
                    <th>Category</th>
                    <th>Position</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Summer Badminton Cup 2026</td>
                    <td>Men's Singles</td>
                    <td>Quarter Final</td>
                    <td><span className="status-pill">Ongoing</span></td>
                  </tr>
                  <tr>
                    <td>City Badminton League 2025</td>
                    <td>Men's Singles</td>
                    <td>Runner Up (2nd)</td>
                    <td><span className="badge-green">Completed</span></td>
                  </tr>
                  <tr>
                    <td>Inter-Club Championship</td>
                    <td>Doubles</td>
                    <td>Winner (1st)</td>
                    <td><span className="badge-green">Completed</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="stat-footer-bar">
          <div>
            <strong>Real-Time Match Alerts Active</strong>
            <p>You will receive instant browser score updates for your subscribed tournaments.</p>
          </div>
          <button className="stat-footer-btn" onClick={() => alert("Notification preferences updated.")}>
            <BellRing size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            Notification Settings
          </button>
        </div>
      </main>

      {/* Live Score Modal */}
      {selectedMatch && (
        <LiveScoreModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          isOrganizer={false}
        />
      )}
    </div>
  );
}
