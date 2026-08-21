import { useLiveMatch } from "../context/LiveMatchContext";
import { X, Plus, CheckCircle, Radio, Trophy } from "lucide-react";

export default function LiveScoreModal({ match, onClose, isOrganizer = false }) {
  const { updateMatchScore, finishMatch } = useLiveMatch();

  if (!match) return null;

  const isCompleted = match.status === "COMPLETED";

  return (
    <div className="live-modal-overlay" onClick={onClose}>
      <div className="live-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="live-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="live-modal-header">
          <span className="live-modal-sport">{match.sportIcon} {match.sportName}</span>
          <div className="live-modal-status">
            {!isCompleted ? (
              <>
                <Radio size={14} className="live-pulsing-dot" />
                <span>LIVE CONTROL</span>
              </>
            ) : (
              <span className="badge-green">COMPLETED</span>
            )}
          </div>
        </div>

        <p className="live-modal-sub">{match.tournament} · {match.round}</p>

        <div className="live-scoreboard-box">
          <div className={`live-team-col ${match.server === "p1" ? "serving" : ""}`}>
            <span className="team-name">{match.player1.name}</span>
            <div className="team-score-display">{match.player1.score}</div>

            {isOrganizer && !isCompleted && (
              <div className="score-ctrl-btns">
                <button
                  className="ctrl-btn add"
                  onClick={() => updateMatchScore(match.id, 1, 1)}
                >
                  <Plus size={16} /> Point
                </button>
              </div>
            )}
          </div>

          <div className="vs-divider">
            <span>VS</span>
            {match.currentSet && <span className="set-tag">Set {match.currentSet}</span>}
          </div>

          <div className={`live-team-col ${match.server === "p2" ? "serving" : ""}`}>
            <span className="team-name">{match.player2.name}</span>
            <div className="team-score-display">{match.player2.score}</div>

            {isOrganizer && !isCompleted && (
              <div className="score-ctrl-btns">
                <button
                  className="ctrl-btn add"
                  onClick={() => updateMatchScore(match.id, 2, 1)}
                >
                  <Plus size={16} /> Point
                </button>
              </div>
            )}
          </div>
        </div>

        {isOrganizer && !isCompleted && (
          <div className="live-organizer-actions">
            <button
              className="finish-match-btn"
              onClick={() => {
                const winner =
                  match.player1.score > match.player2.score
                    ? match.player1.name
                    : match.player2.name;
                finishMatch(match.id, winner);
              }}
            >
              <CheckCircle size={16} /> Finish Match &amp; Declare Winner
            </button>
          </div>
        )}

        {isCompleted && match.winner && (
          <div className="winner-banner">
            <Trophy size={20} color="#ffb300" />
            <span>Winner: <strong>{match.winner}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
