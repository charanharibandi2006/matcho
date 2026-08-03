import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/images/logo.png";
import {
  Bell,
  User,
  Trophy,
  MapPin,
  CalendarDays,
  Users,
  ListChecks,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { useLiveMatch } from "../context/LiveMatchContext";
import "./RegisterForm.css";
import "./ExtraPages.css";

const SPORT_OPTIONS = [
  { id: "badminton", name: "Badminton", icon: "🏸" },
  { id: "tennis", name: "Tennis", icon: "🎾" },
  { id: "cricket", name: "Cricket", icon: "🏏" },
  { id: "football", name: "Football", icon: "⚽" },
  { id: "tabletennis", name: "Table Tennis", icon: "🏓" },
  { id: "basketball", name: "Basketball", icon: "🏀" },
  { id: "volleyball", name: "Volleyball", icon: "🏐" },
  { id: "kabaddi", name: "Kabaddi", icon: "🤼" },
  { id: "chess", name: "Chess", icon: "♟️" },
  { id: "athletics", name: "Athletics", icon: "🏃" },
];

const FORMATS = ["Knockout", "Round Robin", "Round Robin + Knockout", "League"];

export default function CreateTournament() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTournament } = useLiveMatch();

  const preSelectedSport = location.state?.sport;

  const [form, setForm] = useState({
    name: "",
    sport: preSelectedSport?.id || "badminton",
    category: "",
    format: "Knockout",
    startDate: "",
    endDate: "",
    location: "",
    maxParticipants: "",
    description: "",
  });
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("End date cannot be before the start date.");
      return;
    }

    const sportObj = SPORT_OPTIONS.find((s) => s.id === form.sport) || SPORT_OPTIONS[0];

    addTournament({
      name: form.name.trim(),
      sport: sportObj.id,
      sportName: sportObj.name,
      sportIcon: sportObj.icon,
      category: form.category.trim() || "Open Category",
      format: form.format,
      startDate: form.startDate,
      endDate: form.endDate,
      location: form.location.trim() || "TBD",
      maxParticipants: Number(form.maxParticipants) || 0,
      description: form.description.trim(),
    });

    navigate("/organizer-dashboard");
  }

  return (
    <div className="reg-shell">
      <header className="reg-topbar">
        <img
          src={logo}
          alt="MATCHO"
          className="reg-logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        />
        <div className="reg-topbar-right">
          <button className="reg-icon-btn">
            <Bell size={20} />
          </button>
          <div className="reg-avatar" style={{ cursor: "pointer" }} onClick={() => navigate("/profile")}>
            <User size={18} />
          </div>
          <span className="reg-username">Organizer Admin</span>
        </div>
      </header>

      <main className="reg-main">
        <p className="reg-page-title">Create Tournament</p>

        <form className="reg-layout" onSubmit={handleSubmit}>
          <div className="reg-card">
            <h1>Tournament Details</h1>
            <p>Fill in the details to launch your tournament</p>

            {error && <div className="ep-error-box">{error}</div>}

            <div className="reg-row">
              <div className="reg-field full">
                <label>
                  Tournament Name <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <Trophy size={16} />
                  <input
                    type="text"
                    placeholder="e.g. Summer Badminton Cup 2026"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="reg-row">
              <div className="reg-field">
                <label>
                  Sport <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <select
                    value={form.sport}
                    onChange={(e) => update("sport", e.target.value)}
                    required
                  >
                    {SPORT_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="reg-field">
                <label>Category</label>
                <div className="reg-input-wrap">
                  <ListChecks size={16} />
                  <input
                    type="text"
                    placeholder="e.g. Men's Singles"
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="reg-row">
              <div className="reg-field">
                <label>
                  Start Date <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <CalendarDays size={16} />
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="reg-field">
                <label>
                  End Date <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <CalendarDays size={16} />
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => update("endDate", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="reg-row">
              <div className="reg-field">
                <label>
                  Location <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <MapPin size={16} />
                  <input
                    type="text"
                    placeholder="City / Venue"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="reg-field">
                <label>Max Participants</label>
                <div className="reg-input-wrap">
                  <Users size={16} />
                  <input
                    type="number"
                    min="2"
                    placeholder="e.g. 32"
                    value={form.maxParticipants}
                    onChange={(e) => update("maxParticipants", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="reg-field full">
              <label>Format</label>
              <div className="reg-pills">
                {FORMATS.map((f) => (
                  <button
                    type="button"
                    key={f}
                    className={`reg-pill ${form.format === f ? "active" : ""}`}
                    onClick={() => update("format", f)}
                  >
                    <span className="dot" />
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="reg-field full" style={{ marginTop: 18 }}>
              <label>Description</label>
              <div className="reg-input-wrap ep-textarea-wrap">
                <FileText size={16} />
                <textarea
                  placeholder="Tell players what this tournament is about..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="reg-safe-box">
              <div className="reg-safe-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong>Ready to publish</strong>
                <p>Your tournament will appear on your dashboard and be open for registrations.</p>
              </div>
            </div>

            <div className="reg-actions">
              <button type="button" className="reg-cancel" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="reg-next">
                Create Tournament
              </button>
            </div>
          </div>

          <aside className="reg-side">
            <h3>Tips for a great tournament</h3>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <Trophy size={17} />
              </div>
              <div>
                <strong>Pick a clear format</strong>
                <p>Knockout is fastest, round robin is fairest for small groups.</p>
              </div>
            </div>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <CalendarDays size={17} />
              </div>
              <div>
                <strong>Give enough time</strong>
                <p>Leave a few days between registration close and start date.</p>
              </div>
            </div>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <Users size={17} />
              </div>
              <div>
                <strong>Set a realistic cap</strong>
                <p>Max participants helps players know how competitive it'll be.</p>
              </div>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
