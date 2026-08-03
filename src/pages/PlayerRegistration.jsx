import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/images/logo.png";
import {
  Bell,
  User,
  Phone,
  Mail,
  Calendar,
  Camera,
  ShieldCheck,
  Trophy,
  BarChart3,
  BellRing,
  UserCircle2,
} from "lucide-react";
import "./RegisterForm.css";

export default function PlayerRegistration() {
  const navigate = useNavigate();
  const [gender, setGender] = useState("Male");
  const [form, setForm] = useState({
    fullName: "",
    mobile: "9347778086",
    email: "",
    dob: "",
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    navigate("/select-sport");
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
        <p className="reg-page-title">Player registration</p>

        <form className="reg-layout" onSubmit={handleSubmit}>
          <div className="reg-card">
            <h1>Basic Information</h1>
            <p>Let's start with your basic details</p>

            <div className="reg-row">
              <div className="reg-field full">
                <label>
                  Full Name <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <User size={16} />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="reg-row">
              <div className="reg-field">
                <label>
                  Mobile Number <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <Phone size={16} />
                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={form.mobile}
                    onChange={(e) => update("mobile", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="reg-field">
                <label>
                  Email <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <Mail size={16} />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="reg-row">
              <div className="reg-field">
                <label>
                  Date of Birth <span className="req">*</span>
                </label>
                <div className="reg-input-wrap">
                  <Calendar size={16} />
                  <input
                    type="text"
                    placeholder="DD / MM / YYYY"
                    value={form.dob}
                    onFocus={(e) => (e.target.type = "date")}
                    onChange={(e) => update("dob", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="reg-field">
                <label>
                  Gender <span className="req">*</span>
                </label>
                <div className="reg-pills">
                  {["Male", "Female", "Other"].map((g) => (
                    <button
                      type="button"
                      key={g}
                      className={`reg-pill ${gender === g ? "active" : ""}`}
                      onClick={() => setGender(g)}
                    >
                      <span className="dot" />
                      {g}
                    </button>
                  ))}
                </div>
              </div>
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
            <h3>Why Register as a Player?</h3>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <Trophy size={17} />
              </div>
              <div>
                <strong>Find &amp; join tournaments</strong>
                <p>Discover tournaments near you and register instantly.</p>
              </div>
            </div>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <BarChart3 size={17} />
              </div>
              <div>
                <strong>Track your performance</strong>
                <p>View match history, stats and improve your game.</p>
              </div>
            </div>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <BellRing size={17} />
              </div>
              <div>
                <strong>Get real-time updates</strong>
                <p>Receive live scores, notifications and important updates.</p>
              </div>
            </div>

            <div className="reg-side-item">
              <div className="reg-side-icon">
                <UserCircle2 size={17} />
              </div>
              <div>
                <strong>Build your profile</strong>
                <p>Showcase your skills and connect with other players.</p>
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
