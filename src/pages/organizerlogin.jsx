import logo from "../assets/images/logo.png";
import { Bell, User, UserPlus, Trophy, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function OrganizerLogin() {
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

          <div className="dash-avatar" style={{ cursor: "pointer" }} onClick={() => navigate("/profile", { state: { role: "organizer" } })}>
            <User size={18} />
          </div>

          <span className="dash-username">Organizer Portal</span>
        </div>
      </header>

      {/* Welcome */}
      <section className="dash-welcome">
        <div>
          <h1>Welcome Back, Organizer!</h1>
          <p>Manage tournaments, register teams and track live scores.</p>
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
            <h3>Register as Player</h3>
            <p>Join tournaments, compete and showcase your skills.</p>
          </div>

          <button
            className="purple-btn"
            onClick={() => navigate("/player-registration")}
          >
            Register as Player →
          </button>
        </div>

        <div className="dash-tile">
          <div className="dash-tile-icon orange">
            <Trophy size={26} />
          </div>

          <div className="dash-tile-text">
            <h3>Organizer Dashboard</h3>
            <p>Access live tournament management and match controllers.</p>
          </div>

          <button
            className="orange-btn"
            onClick={() => navigate("/organizer-dashboard")}
          >
            Go to Organizer Dashboard →
          </button>
        </div>
      </section>
    </div>
  );
}