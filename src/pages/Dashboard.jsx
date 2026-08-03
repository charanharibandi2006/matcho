import logo from "../assets/images/logo.png";
import { Bell, User, UserPlus, Trophy, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="dash-shell">

      {/* Top Bar */}
      <header className="dash-topbar">
        <img src={logo} alt="MATCHO" className="dash-logo" />

        <div className="dash-topbar-right">
          <button className="dash-bell">
            <Bell size={20} />
          </button>

          <div className="dash-avatar" style={{ cursor: "pointer" }} onClick={() => navigate("/profile")}>
            <User size={18} />
          </div>

          <span className="dash-username">User</span>
        </div>
      </header>

      {/* Welcome */}

      <section className="dash-welcome">

        <div>
          <h1>Welcome back User!</h1>
          <p>Ready to play and win?</p>
        </div>

        <div className="dash-date">
          <CalendarDays size={18} />
          <span>18 July 2026, Friday</span>
        </div>

      </section>

      {/* Register Cards */}

      <section className="dash-tiles">

        <div className="dash-tile">

          <div className="dash-tile-icon purple">
            <UserPlus size={26} />
          </div>

          <div className="dash-tile-text">
            <h3>Register as a player</h3>

            <p>
              Join tournaments, compete and showcase your skills.
            </p>
          </div>

          <button className="purple-btn" onClick={() => navigate("/player-registration")}>
            Register as Player →
          </button>

        </div>

        <div className="dash-tile">

          <div className="dash-tile-icon orange">
            <Trophy size={26} />
          </div>

          <div className="dash-tile-text">
            <h3>Register as Organizer</h3>

            <p>
              Create and manage tournaments easily and efficiently.
            </p>
          </div>

          <button className="orange-btn" onClick={() => navigate("/organizer-registration")}>
            Register as Organizer →
          </button>

        </div>

      </section>

    </div>
  );
}