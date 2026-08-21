import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/images/logo.png";
import {
  Bell,
  User,
  Landmark,
  Camera,
  ShieldCheck,
  Trophy,
  ClipboardList,
  Activity,
  LineChart,
  Users,
  Building,
  Volleyball,
  GraduationCap,
  Briefcase,
  Dumbbell,
  MoreHorizontal,
} from "lucide-react";
import "./RegisterForm.css";

const CATEGORIES = [
  { id: "apartment", name: "Apartment Community", icon: Building },
  { id: "sportsclub", name: "Sports Club", icon: Volleyball },
  { id: "education", name: "Educational Institution", icon: GraduationCap },
  { id: "corporate", name: "Corporate", icon: Briefcase },
  { id: "academy", name: "Sports Academy", icon: Dumbbell },
  { id: "other", name: "Other", icon: MoreHorizontal },
];

export default function OrganizerRegistration() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("apartment");
  const [form, setForm] = useState({ organizerName: "", orgName: "" });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    navigate("/organizer-dashboard");
  }

  return (
    <div className="reg-shell">
      <header className="reg-topbar">
        <img src={logo} alt="MATCHO" className="reg-logo" />
        <div className="reg-topbar-right">
          <button className="reg-icon-btn">
            <Bell size={20} />
          </button>
          <div className="reg-avatar">
            <User size={18} />
          </div>
          <span className="reg-username">User</span>
        </div>
      </header>

      <main className="reg-main">
        <p className="reg-page-title">Organizer Register Page</p>

        <form className="reg-layout" onSubmit={handleSubmit}>
          <div className="reg-card">
            <h1>Organisation Information</h1>
            <p>Tell us about your organisation</p>

            <div className="reg-row">
              <div className="reg-field full">
                <label>
                  Organizer Name <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <User size={16} />
                  <input
                    type="text"
                    placeholder="Enter organizer name"
                    value={form.organizerName}
                    onChange={(e) => update("organizerName", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="reg-row">
              <div className="reg-field full">
                <label>
                  Organization/Club/Academy Name <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <Landmark size={16} />
                  <input
                    type="text"
                    placeholder="Enter organization name"
                    value={form.orgName}
                    onChange={(e) => update("orgName", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="reg-category-grid">
              {CATEGORIES.map(({ id, name, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  className={`reg-category-card ${
                    category === id ? "active" : ""
                  }`}
                  onClick={() => setCategory(id)}
                >
                  <div className="reg-category-icon">
                    <Icon size={20} />
                  </div>
                  <p>{name}</p>
                </button>
              ))}
            </div>

            <div className="reg-field full" style={{ marginBottom: 18 }}>
              <label>Profile Photo (Optional)</label>
            </div>

            <div className="reg-upload-row">
              <div className="reg-upload-box">
                <Camera size={26} />
              </div>
              <div className="reg-upload-text">
                <strong>Upload Photo</strong>
                <span>JPG,PNG upto 5MB</span>
              </div>
            </div>

            <div className="reg-safe-box">
              <div className="reg-safe-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong>Your information is safe with us</strong>
                <p>We never share your personal details with anyone.</p>
              </div>
            </div>

            <div className="reg-actions">
              <button
                type="button"
                className="reg-cancel"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button type="submit" className="reg-next">
                Next
              </button>
            </div>
          </div>

          <aside className="reg-side">
            <h3>Why Register as a Organizer ?</h3>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <Trophy size={17} />
              </div>
              <div>
                <strong>Create tournaments</strong>
                <p>Organize and manage tournaments with ease</p>
              </div>
            </div>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <ClipboardList size={17} />
              </div>
              <div>
                <strong>Track Registrations</strong>
                <p>Monitor player registrations and manage teams</p>
              </div>
            </div>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <Activity size={17} />
              </div>
              <div>
                <strong>Live Scores and Updates</strong>
                <p>Provide real-time scores and updates to players</p>
              </div>
            </div>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <LineChart size={17} />
              </div>
              <div>
                <strong>Analytics and Reports</strong>
                <p>Get insights and analytics to improve your events</p>
              </div>
            </div>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <Users size={17} />
              </div>
              <div>
                <strong>Build Community</strong>
                <p>Grow your sports community and connect with players</p>
              </div>
            </div>

            <div className="reg-account-box">
              <strong>Already have an account?</strong>
              <p>If you're already registered, please login to continue.</p>
              <Link to="/signin">
                <button type="button" className="reg-login-btn">
                  Login Now →
                </button>
              </Link>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
