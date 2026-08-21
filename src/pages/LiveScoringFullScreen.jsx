import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Radio,
  Wifi,
  User,
  RotateCcw,
  AlertCircle,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import RoleSidebar from "../components/RoleSidebar";
import { useLiveMatch } from "../context/LiveMatchContext";
import { getDashboardPath } from "../utils/auth";
import "./LiveScoring.css";
import "./OrganizerDashboard.css";

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveScoringFullScreen() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const {
    matches,
    notifications,
    updateMatchScore,
    finishMatch,
    completeCurrentSet,
    changeServer,
    undoLastPoint,
  } = useLiveMatch();

  const match = matches.find((m) => m.id === matchId);
  const [activeSet, setActiveSet] = useState(match?.currentSet || 1);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!match || match.status !== "LIVE") return;
    const start = match.startedAt || Date.now() - 28 * 60 * 1000;
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match]);

  const matchActivity = useMemo(() => {
    if (!match) return [];
    return notifications
      .filter((n) => n.matchId === match.id || n.text.includes(match.player1.name) || n.text.includes(match.player2.name))
      .slice(0, 8);
  }, [notifications, match]);

  if (!match) {
    return (
      <div className="org-layout">
        <RoleSidebar activeItem="Live Scoring" />
        <div className="org-main">
          <div className="org-content" style={{ padding: 40, textAlign: "center" }}>
            <h2>Match not found</h2>
            <button className="org-btn-primary" onClick={() => navigate(getDashboardPath())}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = match.status === "COMPLETED";
  const team1Short = match.player1.shortName || match.player1.name.split(" ").pop()?.toUpperCase().slice(0, 6) || "TEAM1";
  const team2Short = match.player2.shortName || match.player2.name.split(" ").pop()?.toUpperCase().slice(0, 6) || "TEAM2";
  const totalPoints = (typeof match.player1.score === "number" ? match.player1.score : 0) +
    (typeof match.player2.score === "number" ? match.player2.score : 0);

  const handleScore = (player, points) => {
    for (let i = 0; i < points; i++) {
      updateMatchScore(match.id, player, 1);
    }
  };

  const handleFinish = () => {
    const winner =
      match.player1.score > match.player2.score
        ? match.player1.name
        : match.player2.name;
    finishMatch(match.id, winner);
    navigate(getDashboardPath());
  };

  return (
    <div className="org-layout live-scoring-layout">
      <RoleSidebar activeItem="Live Scoring" />

      <div className="org-main">
        {/* Top bar */}
        <header className="ls-topbar">
          <button className="ls-back-btn" onClick={() => navigate("/organizer-dashboard")}>
            <ArrowLeft size={16} /> Back to Matches
          </button>

          <div className="ls-topbar-center">
            {!isCompleted && (
              <span className="ls-live-badge">
                <Radio size={12} className="live-pulsing-dot" /> LIVE
              </span>
            )}
            <span className="ls-timer">{formatDuration(elapsed)}</span>
          </div>

          <div className="ls-topbar-right">
            <Wifi size={18} className="ls-wifi" />
            <button className="org-icon-btn" title="Notifications">
              <Bell size={18} />
              <span className="org-notif-dot">3</span>
            </button>
            <div className="org-avatar-sm">C</div>
          </div>
        </header>

        <div className="ls-body">
          {/* Main scoring area */}
          <div className="ls-main-panel">
            {/* Match header */}
            <div className="ls-match-header">
              <div>
                <h2>
                  {match.sportName?.toUpperCase()} • {match.category} • {match.round}
                </h2>
                <p>{match.court || match.field || "Court 1"} • {match.matchType === "doubles" ? "Doubles" : "Singles"} • Best of {match.bestOf || 3} Sets</p>
              </div>
              {!isCompleted && (
                <button className="ls-end-match-btn" onClick={handleFinish}>
                  End Match
                </button>
              )}
            </div>

            {/* Scoreboard */}
            <div className="ls-scoreboard">
              <div className={`ls-team-score team-blue ${match.server === "p1" ? "serving" : ""}`}>
                <span className="ls-team-label">{team1Short}</span>
                <span className="ls-score-num">{match.player1.score}</span>
              </div>
              <div className="ls-score-divider">
                <span className="ls-win-rule">First to 21, Win by 2</span>
              </div>
              <div className={`ls-team-score team-pink ${match.server === "p2" ? "serving" : ""}`}>
                <span className="ls-team-label">{team2Short}</span>
                <span className="ls-score-num">{match.player2.score}</span>
              </div>
            </div>

            {/* Serving indicator */}
            <div className="ls-serving-bar">
              <span className={match.server === "p1" ? "active-serve" : ""}>
                SERVING • {match.player1.serverName || match.player1.name} • {team1Short}
              </span>
              <span className="ls-vs">vs</span>
              <span className={match.server === "p2" ? "active-serve" : ""}>
                {match.player2.serverName || match.player2.name} • {team2Short}
              </span>
            </div>

            {/* Set tabs */}
            <div className="ls-set-tabs">
              {Array.from({ length: match.bestOf || 3 }, (_, index) => index + 1).map((set) => (
                <button
                  key={set}
                  className={`ls-set-tab ${activeSet === set ? "active" : ""}`}
                  onClick={() => setActiveSet(set)}
                >
                  Set {set}
                  {match.player1.setScores?.[set - 1] != null && (
                    <span className="ls-set-score">
                      {match.player1.setScores[set - 1]}-{match.player2.setScores?.[set - 1]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Scoring controls */}
            {!isCompleted && (
              <div className="ls-controls">
                <div className="ls-team-controls team-blue-ctrl">
                  <span className="ls-ctrl-label">{team1Short}</span>
                  <div className="ls-point-btns">
                    <button className="ls-pt-btn primary" onClick={() => handleScore(1, 1)}>+1</button>
                    <button className="ls-pt-btn" onClick={() => handleScore(1, 2)}>+2</button>
                    <button className="ls-pt-btn" onClick={() => handleScore(1, 3)}>+3</button>
                  </div>
                </div>

                <div className="ls-service-panel">
                  <span className="ls-service-label">SERVICE</span>
                  <div className="ls-server-display">
                    {match.server === "p1"
                      ? match.player1.serverName || match.player1.name
                      : match.player2.serverName || match.player2.name}
                  </div>
                  <button className="ls-change-service" onClick={() => changeServer(match.id)}>
                    Change Service
                  </button>
                </div>

                <div className="ls-team-controls team-pink-ctrl">
                  <span className="ls-ctrl-label">{team2Short}</span>
                  <div className="ls-point-btns">
                    <button className="ls-pt-btn primary" onClick={() => handleScore(2, 1)}>+1</button>
                    <button className="ls-pt-btn" onClick={() => handleScore(2, 2)}>+2</button>
                    <button className="ls-pt-btn" onClick={() => handleScore(2, 3)}>+3</button>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!isCompleted && (
              <div className="ls-action-row">
                <button className="ls-action-btn" onClick={() => undoLastPoint(match.id)}>
                  <RotateCcw size={15} /> Undo
                </button>
                <button className="ls-action-btn" disabled={match.player1.score === match.player2.score} onClick={() => completeCurrentSet(match.id)}>
                  <CheckCircle2 size={15} /> Complete Set {match.currentSet || 1}
                </button>
                <button className="ls-action-btn">
                  <AlertCircle size={15} /> Let
                </button>
                <button className="ls-action-btn">
                  <XCircle size={15} /> Fault
                </button>
              </div>
            )}

            {/* Match summary footer */}
            <div className="ls-summary">
              <div className="ls-summary-item">
                <span>Duration</span>
                <strong>{formatDuration(elapsed)}</strong>
              </div>
              <div className="ls-summary-item">
                <span>Longest Rally</span>
                <strong>28 Shots</strong>
              </div>
              <div className="ls-summary-item">
                <span>Total Points</span>
                <strong>{totalPoints}</strong>
              </div>
              <div className="ls-summary-item">
                <span>Lead Changes</span>
                <strong>4</strong>
              </div>
            </div>

            {/* Set progress bar */}
            <div className="ls-set-progress">
              <div className="ls-progress-label">
                <span>Set {activeSet} Progress</span>
                <span>
                  {typeof match.player1.score === "number" && match.player1.score >= 19
                    ? `${21 - Math.max(match.player1.score, match.player2.score)} points to win`
                    : "In progress"}
                </span>
              </div>
              <div className="ls-progress-bar">
                <div
                  className="ls-progress-blue"
                  style={{
                    width: `${totalPoints > 0 ? ((match.player1.score / totalPoints) * 100) : 50}%`,
                  }}
                />
                <div
                  className="ls-progress-pink"
                  style={{
                    width: `${totalPoints > 0 ? ((match.player2.score / totalPoints) * 100) : 50}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="ls-right-panel">
            <div className="ls-info-card">
              <h4>Match Info</h4>
              <div className="ls-info-row">
                <span>Date</span>
                <strong>{match.date || "15 Aug 2025"}</strong>
              </div>
              <div className="ls-info-row">
                <span>Time</span>
                <strong>{match.startTime || "09:00 AM"}</strong>
              </div>
              <div className="ls-info-row">
                <span>Main Umpire</span>
                <strong>{match.umpire || "R. Karthik"}</strong>
              </div>
              <div className="ls-info-row">
                <span>Venue</span>
                <strong>{match.venue || "Indoor Stadium, BVRCE"}</strong>
              </div>
            </div>

            <div className="ls-info-card">
              <h4>Live Activity</h4>
              <div className="ls-activity-list">
                {matchActivity.length === 0 ? (
                  <p className="ls-activity-empty">No activity yet</p>
                ) : (
                  matchActivity.map((a) => (
                    <div key={a.id} className="ls-activity-item">
                      <span className="ls-activity-score">{a.text.split("!")[0]}</span>
                      <span className="ls-activity-time">{a.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="ls-info-card">
              <h4>Scorers</h4>
              <div className="ls-scorer-row">
                <User size={16} />
                <div>
                  <strong>Charan</strong>
                  <span>Primary scorer</span>
                </div>
              </div>
              <div className="ls-scorer-row">
                <User size={16} />
                <div>
                  <strong>Navaneeth</strong>
                  <span>Secondary scorer</span>
                </div>
              </div>
            </div>

            <div className="ls-sync-status">
              <span className="ls-sync-dot" /> Sync Status: <strong>Live</strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
