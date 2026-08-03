import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/images/logo.png";
import { Bell, User, Search, Sparkles, BookOpenCheck, Users2 } from "lucide-react";
import "./SelectSportPage.css";

const SPORTS = [
  { id: "badminton", name: "Badminton", tag: "Singles,Doubles, Mixed doubles", icon: "🏸" },
  { id: "tennis", name: "Tennis", tag: "Singles,Doubles, Mixed doubles", icon: "🎾" },
  { id: "cricket", name: "Cricket", tag: "T20,ODI,Test Corporate", icon: "🏏" },
  { id: "football", name: "Football", tag: "5v5, 7v7, 11v11 Corporate", icon: "⚽" },
  { id: "tabletennis", name: "Table Tennis", tag: "Singles,Doubles, Team Events", icon: "🏓" },
  { id: "basketball", name: "Basketball", tag: "3v3, 5v5, Corporate", icon: "🏀" },
  { id: "volleyball", name: "Volleyball", tag: "Mixed", icon: "🏐" },
  { id: "kabaddi", name: "Kabaddi", tag: "Men's,Women's, Mixed", icon: "🤼" },
  { id: "chess", name: "Chess", tag: "Individual, Team", icon: "♟️" },
  { id: "athletics", name: "Athletics", tag: "Track, Field, Marathon", icon: "🏃" },
  { id: "other", name: "Other", tag: "Can't find your sport? Tell us.", icon: "⋯" },
];

export default function SelectSportPage() {
  const [selected, setSelected] = useState("badminton");
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.state?.mode === "organizer" ? "organizer" : "player";

  const filtered = SPORTS.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleNext() {
    const sportObj = SPORTS.find((s) => s.id === selected);
    if (mode === "organizer") {
      navigate("/create-tournament", { state: { sport: sportObj } });
    } else {
      navigate("/player-dashboard");
    }
  }

  return (
    <div className="sport-shell">
      <header className="sport-topbar">
        <img src={logo} alt="MATCHO" className="sport-logo" />
        <div className="sport-topbar-right">
          <button className="sport-icon-btn">
            <Bell size={20} />
          </button>
          <div className="sport-avatar">
            <User size={18} />
          </div>
          <span className="sport-username">User</span>
        </div>
      </header>

      <main className="sport-main">
        <div className="sport-content">
          <h1>Select Sport</h1>
          <p className="sport-subtitle">Choose the sport for your tournament</p>

          <div className="sport-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search sports..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="sport-grid">
            {filtered.map((sport) => (
              <button
                key={sport.id}
                className={`sport-card ${selected === sport.id ? "active" : ""}`}
                onClick={() => setSelected(sport.id)}
                type="button"
              >
                <span className="sport-radio" />
                <div className="sport-icon">{sport.icon}</div>
                <h4>{sport.name}</h4>
                <p>{sport.tag}</p>
              </button>
            ))}
          </div>

          <div className="sport-actions">
            <button className="sport-cancel" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button className="sport-next" onClick={handleNext}>
              Next →
            </button>
          </div>
        </div>

        <aside className="sport-side">
          <h3>Why Sport Selection is important?</h3>

          <div className="sport-side-item">
            <div className="sport-side-icon">
              <Sparkles size={18} />
            </div>
            <p>Helps us customize the tournament experience</p>
          </div>

          <div className="sport-side-item">
            <div className="sport-side-icon">
              <BookOpenCheck size={18} />
            </div>
            <p>Shows relevant rules and formats</p>
          </div>

          <div className="sport-side-item">
            <div className="sport-side-icon">
              <Users2 size={18} />
            </div>
            <p>Attract the right players</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
