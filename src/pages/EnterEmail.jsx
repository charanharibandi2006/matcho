import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import forgetimage from "../assets/images/forgot.png";
import { FiMail } from "react-icons/fi";

export default function EnterEmail() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    console.log({ email });
    navigate("/otp");
  }

  return (
    <section className="splash">
      <div className="brand-mark">
        <img src={logo} alt="MATCHO" className="brand-logo" />
      </div>

      <div className="splash-copy">
        <img
          src={forgetimage}
          alt="Forgot Password"
          className="forget-image"
        />

        <h1>Forgot Password?</h1>
        <p>
          No worries! Enter your email address and we'll send you a link to
          reset your password.
        </p>
      </div>

      <form className="reset-password-container" onSubmit={handleSubmit}>
        <div className="email-container">
          <FiMail className="email-icon" />
          <input
            className="auth-input email-input"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button className="primary-action" type="submit">
          Send Reset Link
        </button>
      </form>
    </section>
  );
}
