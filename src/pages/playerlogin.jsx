import logo from "../assets/images/logo.png";
import { Bell, User, UserPlus, Trophy, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function PlayerLogin() {
  const navigate = useNavigate();

  return (
    <div className="dash-shell">
      {/* Top Bar */}
      <header className="dash-topbar">
        <img
          src={logo}
          alt="MATCHO"
          className="dash-logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        />

        <div className="dash-topbar-right">
          <button className="dash-bell">
            <Bell size={20} />
          </button>

          <div className="dash-avatar" style={{ cursor: "pointer" }} onClick={() => navigate("/profile", { state: { role: "player" } })}>
            <User size={18} />
          </div>

          <span className="dash-username">Player Portal</span>
        </div>
      </header>

      {/* Welcome */}
      <section className="dash-welcome">
        <div>
          <h1>Welcome Back, Player!</h1>
          <p>Ready to play, win and track your tournament stats?</p>
        </div>

        <div className="dash-date">
          <CalendarDays size={18} />
          <span>29 July 2026</span>
        </div>
      </section>

      {/* Register Cards */}
      <section className="dash-tiles">
        <div className="dash-tile">
          <div className="dash-tile-icon purple">
            <UserPlus size={26} />
          </div>

          <div className="dash-tile-text">
            <h3>Player Dashboard</h3>
            <p>View your stats, win rates and live tournament matches.</p>
          </div>

          <button
            className="purple-btn"
            onClick={() => navigate("/player-dashboard")}
          >
            Go to Player Dashboard →
          </button>
        </div>

        <div className="dash-tile">
          <div className="dash-tile-icon orange">
            <Trophy size={26} />
          </div>

          <div className="dash-tile-text">
            <h3>Select Sport &amp; Register</h3>
            <p>Find new tournaments near you and join instantly.</p>
          </div>

          <button
            className="orange-btn"
            onClick={() => navigate("/select-sport")}
          >
            Select Sport →
          </button>
        </div>
      </section>
    </div>
  );
}