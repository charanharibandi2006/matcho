import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import { Bell, User, Radio, Plus, Minus, CheckCircle2, PlayCircle, PauseCircle } from "lucide-react";
import { useLiveMatch } from "../context/LiveMatchContext";
import "./StatsDashboard.css";
import "./ExtraPages.css";

const TABS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "completed", label: "Completed" },
];

export default function ScoreUpdate() {
  const navigate = useNavigate();
  const {
    matches,
    updateMatchScore,
    finishMatch,
    isSimulating,
    toggleSimulation,
  } = useLiveMatch();
  const [activeTab, setActiveTab] = useState("all");

  const filteredMatches = matches.filter((m) => {
    if (activeTab === "all") return true;
    if (activeTab === "live") return m.status === "LIVE";
    if (activeTab === "completed") return m.status === "COMPLETED";
    return true;
  });

  const liveCount = matches.filter((m) => m.status === "LIVE").length;

  return (
    <div className="stat-shell">
      <header className="stat-topbar">
        <img
          src={logo}
          alt="MATCHO"
          className="stat-logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        />
        <div className="stat-topbar-right">
          <button className="stat-icon-btn" title="Notifications">
            <Bell size={20} />
          </button>
          <div className="stat-avatar" style={{ cursor: "pointer" }} onClick={() => navigate("/profile")}>
            <User size={18} />
          </div>
          <span className="stat-username">Organizer Admin</span>
        </div>
      </header>

      <main className="stat-main">
        <div className="dash-header-flex">
          <div>
            <h1>Live Score Update Controller</h1>
            <p>Update points, finish matches and manage every fixture in real time.</p>
          </div>
          <button
            className={`sim-toggle-btn ${isSimulating ? "active" : ""}`}
            onClick={toggleSimulation}
            type="button"
          >
            {isSimulating ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
            {isSimulating ? "Pause Auto-Simulation" : "Resume Auto-Simulation"}
          </button>
        </div>

        <div className="stat-panel" style={{ marginBottom: 24 }}>
          <div className="stat-panel-head">
            <div className="flex-head">
              <h4>All Matches</h4>
              <span className="live-pill-sm">
                <Radio size={12} className="live-pulsing-dot" /> {liveCount} LIVE
              </span>
            </div>
            <div className="filter-tabs-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="stat-empty">No matches in this filter yet.</div>
          ) : (
            <div className="ep-score-grid">
              {filteredMatches.map((m) => {
                const isCompleted = m.status === "COMPLETED";
                return (
                  <div key={m.id} className={`ep-score-card ${m.status === "LIVE" ? "is-live" : ""}`}>
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

                    <p className="stat-row-sub" style={{ margin: "6px 0 14px" }}>
                      {m.tournament} · {m.round}
                    </p>

                    <div className="ep-score-row">
                      <span className="team-n">{m.player1.name}</span>
                      <div className="ep-score-ctrl">
                        {!isCompleted && typeof m.player1.score === "number" && (
                          <button
                            className="ctrl-btn remove"
                            onClick={() => updateMatchScore(m.id, 1, -1)}
                            type="button"
                          >
                            <Minus size={14} />
                          </button>
                        )}
                        <strong className="team-s">{m.player1.score}</strong>
                        {!isCompleted && typeof m.player1.score === "number" && (
                          <button
                            className="ctrl-btn add"
                            onClick={() => updateMatchScore(m.id, 1, 1)}
                            type="button"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="ep-score-row">
                      <span className="team-n">{m.player2.name}</span>
                      <div className="ep-score-ctrl">
                        {!isCompleted && typeof m.player2.score === "number" && (
                          <button
                            className="ctrl-btn remove"
                            onClick={() => updateMatchScore(m.id, 2, -1)}
                            type="button"
                          >
                            <Minus size={14} />
                          </button>
                        )}
                        <strong className="team-s">{m.player2.score}</strong>
                        {!isCompleted && typeof m.player2.score === "number" && (
                          <button
                            className="ctrl-btn add"
                            onClick={() => updateMatchScore(m.id, 2, 1)}
                            type="button"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {isCompleted && m.winner && (
                      <div className="winner-banner" style={{ marginTop: 12 }}>
                        <CheckCircle2 size={16} color="#21b566" />
                        <span>Winner: <strong>{m.winner}</strong></span>
                      </div>
                    )}

                    {!isCompleted && (
                      <button
                        className="finish-match-btn"
                        style={{ marginTop: 14 }}
                        onClick={() => {
                          const winner =
                            m.player1.score > m.player2.score ? m.player1.name : m.player2.name;
                          finishMatch(m.id, winner);
                        }}
                      >
                        <CheckCircle2 size={16} /> Finish Match &amp; Declare Winner
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
