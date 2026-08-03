import { Trophy, Radio, CheckCircle2 } from "lucide-react";

const SAMPLE_BRACKET = {
  quarterFinals: [
    {
      id: "q1",
      p1: { name: "Rahul Sharma", score: 2, winner: true },
      p2: { name: "Aditya Roy", score: 0 },
      status: "COMPLETED",
    },
    {
      id: "q2",
      p1: { name: "Karan Mehta", score: 2, winner: true },
      p2: { name: "Siddharth Rao", score: 1 },
      status: "COMPLETED",
    },
    {
      id: "q3",
      p1: { name: "Vikram Malhotra", score: 2, winner: true },
      p2: { name: "Rohan Kapoor", score: 0 },
      status: "COMPLETED",
    },
    {
      id: "q4",
      p1: { name: "Anish Verma", score: 2, winner: true },
      p2: { name: "Varun Nair", score: 1 },
      status: "COMPLETED",
    },
  ],
  semiFinals: [
    {
      id: "s1",
      p1: { name: "Rahul Sharma", score: 18 },
      p2: { name: "Karan Mehta", score: 16 },
      status: "LIVE",
    },
    {
      id: "s2",
      p1: { name: "Vikram Malhotra", score: 0 },
      p2: { name: "Anish Verma", score: 0 },
      status: "UPCOMING",
    },
  ],
  final: [
    {
      id: "f1",
      p1: { name: "TBD", score: "-" },
      p2: { name: "TBD", score: "-" },
      status: "UPCOMING",
    },
  ],
};

export default function TournamentBracket({ title = "Tournament Fixtures & Bracket" }) {
  return (
    <div className="bracket-container">
      <div className="bracket-header">
        <div>
          <h4>{title}</h4>
          <p>Real-time tournament progression map</p>
        </div>
      </div>

      <div className="bracket-tree-wrapper">
        {/* Quarter Finals Column */}
        <div className="bracket-column">
          <div className="bracket-col-title">Quarter-Finals</div>
          {SAMPLE_BRACKET.quarterFinals.map((match) => (
            <div key={match.id} className="bracket-match-card">
              <div className={`bracket-player ${match.p1.winner ? "winner" : ""}`}>
                <span>{match.p1.name}</span>
                <strong className="bracket-score">{match.p1.score}</strong>
              </div>
              <div className={`bracket-player ${match.p2.winner ? "winner" : ""}`}>
                <span>{match.p2.name}</span>
                <strong className="bracket-score">{match.p2.score}</strong>
              </div>
              <div className="bracket-status">
                <CheckCircle2 size={12} color="#21b566" /> Completed
              </div>
            </div>
          ))}
        </div>

        {/* Semi Finals Column */}
        <div className="bracket-column">
          <div className="bracket-col-title">Semi-Finals</div>
          {SAMPLE_BRACKET.semiFinals.map((match) => (
            <div
              key={match.id}
              className={`bracket-match-card ${match.status === "LIVE" ? "live-border" : ""}`}
            >
              <div className="bracket-player">
                <span>{match.p1.name}</span>
                <strong className="bracket-score">{match.p1.score}</strong>
              </div>
              <div className="bracket-player">
                <span>{match.p2.name}</span>
                <strong className="bracket-score">{match.p2.score}</strong>
              </div>
              <div className="bracket-status">
                {match.status === "LIVE" ? (
                  <span className="live-pill-sm">
                    <Radio size={10} className="live-pulsing-dot" /> LIVE NOW
                  </span>
                ) : (
                  <span className="upcoming-pill">Upcoming</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Finals Column */}
        <div className="bracket-column final-col">
          <div className="bracket-col-title">
            <Trophy size={14} color="#ffb300" /> Championship Final
          </div>
          {SAMPLE_BRACKET.final.map((match) => (
            <div key={match.id} className="bracket-match-card trophy-card">
              <div className="bracket-player">
                <span>{match.p1.name}</span>
                <strong className="bracket-score">{match.p1.score}</strong>
              </div>
              <div className="bracket-player">
                <span>{match.p2.name}</span>
                <strong className="bracket-score">{match.p2.score}</strong>
              </div>
              <div className="bracket-status">
                <span className="upcoming-pill">Final Match</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
