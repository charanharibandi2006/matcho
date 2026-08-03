import { useLiveMatch } from "../context/LiveMatchContext";
import { Radio, RefreshCw } from "lucide-react";

export default function LiveTicker({ onSelectMatch }) {
  const { matches, isSimulating, toggleSimulation } = useLiveMatch();
  const liveMatches = matches.filter((m) => m.status === "LIVE");

  if (liveMatches.length === 0) return null;

  return (
    <div className="live-ticker-wrap">
      <div className="live-ticker-badge">
        <Radio size={14} className="live-pulsing-dot" />
        <span>LIVE SCORES</span>
      </div>

      <div className="live-ticker-feed">
        {liveMatches.map((m) => (
          <div
            key={m.id}
            className="live-ticker-item"
            onClick={() => onSelectMatch && onSelectMatch(m)}
          >
            <span className="ticker-sport-icon">{m.sportIcon}</span>
            <span className="ticker-teams">
              {m.player1.name} <strong>{m.player1.score}</strong> -{" "}
              <strong>{m.player2.score}</strong> {m.player2.name}
            </span>
            <span className="ticker-meta">
              {m.round} · {m.court || m.field || "Live"}
            </span>
          </div>
        ))}
      </div>

      <button
        className={`sim-toggle-btn ${isSimulating ? "active" : ""}`}
        onClick={toggleSimulation}
        title="Toggle Real-Time Live Auto Simulation"
      >
        <RefreshCw size={13} className={isSimulating ? "spin-icon" : ""} />
        <span>{isSimulating ? "Simulating Live" : "Paused"}</span>
      </button>
    </div>
  );
}
