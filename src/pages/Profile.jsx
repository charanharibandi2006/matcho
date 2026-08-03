import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/images/logo.png";
import {
  Bell,
  User,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Save,
  X,
  Trophy,
  Swords,
  Target,
} from "lucide-react";
import { useLiveMatch } from "../context/LiveMatchContext";
import "./StatsDashboard.css";
import "./RegisterForm.css";
import "./ExtraPages.css";

const AVATAR_OPTIONS = ["🏸", "🏆", "⚽", "🎾", "🏏", "🏀", "🏐", "🤼", "♟️", "🏃"];

const PLAYER_STATS = [
  { icon: Trophy, cls: "icon-purple", value: 12, label: "Tournaments" },
  { icon: Swords, cls: "icon-green", value: 42, label: "Matches Played" },
  { icon: Target, cls: "icon-blue", value: "68.7%", label: "Win Rate" },
];

const ORGANIZER_STATS = [
  { icon: Trophy, cls: "icon-purple", value: 8, label: "Tournaments Hosted" },
  { icon: Swords, cls: "icon-green", value: 256, label: "Total Players Managed" },
  { icon: Target, cls: "icon-blue", value: 42, label: "Matches Completed" },
];

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profiles, updateProfile } = useLiveMatch();

  const [role, setRole] = useState(location.state?.role === "organizer" ? "organizer" : "player");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profiles[role]);
  const [formRole, setFormRole] = useState(role);

  // Keep the edit form in sync when switching between Player/Organizer tabs
  if (formRole !== role) {
    setFormRole(role);
    setForm(profiles[role]);
    setEditing(false);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSave(e) {
    e.preventDefault();
    updateProfile(role, form);
    setEditing(false);
  }

  function handleCancel() {
    setForm(profiles[role]);
    setEditing(false);
  }

  const stats = role === "player" ? PLAYER_STATS : ORGANIZER_STATS;

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
          <div className="stat-avatar">
            <User size={18} />
          </div>
          <span className="stat-username">{profiles[role].name}</span>
        </div>
      </header>

      <main className="stat-main">
        <div className="dash-header-flex">
          <div>
            <h1>My Profile</h1>
            <p>View and manage your Matcho profile details.</p>
          </div>
          <div className="filter-tabs-sm">
            <button
              className={`tab-btn ${role === "player" ? "active" : ""}`}
              onClick={() => setRole("player")}
              type="button"
            >
              Player
            </button>
            <button
              className={`tab-btn ${role === "organizer" ? "active" : ""}`}
              onClick={() => setRole("organizer")}
              type="button"
            >
              Organizer
            </button>
          </div>
        </div>

        <div className="ep-profile-panel">
          <div className="ep-profile-head">
            <div className="ep-profile-avatar">{form.avatar}</div>
            <div className="ep-profile-headtext">
              <h2>{profiles[role].name}</h2>
              <span className="badge-blue">{profiles[role].role}</span>
            </div>
            {!editing ? (
              <button className="stat-footer-btn" type="button" onClick={() => setEditing(true)}>
                <Pencil size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                Edit Profile
              </button>
            ) : null}
          </div>

          {!editing ? (
            <div className="ep-profile-view">
              <div className="ep-profile-row">
                <Mail size={16} /> <span>{profiles[role].email}</span>
              </div>
              <div className="ep-profile-row">
                <Phone size={16} /> <span>{profiles[role].phone}</span>
              </div>
              <div className="ep-profile-row">
                <MapPin size={16} /> <span>{profiles[role].location}</span>
              </div>
              <p className="ep-profile-bio">{profiles[role].bio}</p>
            </div>
          ) : (
            <form className="ep-profile-form" onSubmit={handleSave}>
              <div className="ep-avatar-picker">
                {AVATAR_OPTIONS.map((a) => (
                  <button
                    type="button"
                    key={a}
                    className={`ep-avatar-option ${form.avatar === a ? "active" : ""}`}
                    onClick={() => update("avatar", a)}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <div className="reg-row">
                <div className="reg-field full">
                  <label>Full Name</label>
                  <div className="reg-input-wrap">
                    <User size={16} />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="reg-row">
                <div className="reg-field">
                  <label>Email</label>
                  <div className="reg-input-wrap">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="reg-field">
                  <label>Phone</label>
                  <div className="reg-input-wrap">
                    <Phone size={16} />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="reg-row">
                <div className="reg-field full">
                  <label>Location</label>
                  <div className="reg-input-wrap">
                    <MapPin size={16} />
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="reg-field full">
                <label>Bio</label>
                <div className="reg-input-wrap ep-textarea-wrap">
                  <textarea
                    rows={3}
                    value={form.bio}
                    onChange={(e) => update("bio", e.target.value)}
                  />
                </div>
              </div>

              <div className="reg-actions">
                <button type="button" className="reg-cancel" onClick={handleCancel}>
                  <X size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                  Cancel
                </button>
                <button type="submit" className="reg-next">
                  <Save size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="stat-cards" style={{ marginTop: 24 }}>
          {stats.map(({ icon: Icon, cls, value, label }) => (
            <div className="stat-card" key={label}>
              <div className={`stat-card-icon ${cls}`}>
                <Icon size={20} />
              </div>
              <div>
                <h3>{value}</h3>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
