import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import logo from "../assets/images/logo.png";
import forgetimage from "../assets/images/forgot.png";
import { FiMail } from "react-icons/fi";

export default function EnterEmail() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [role] = useState("Organizer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Send forgot-password OTP
      await apiRequest("/auth/forgot-password/send-otp", {
        method: "POST",
        body: JSON.stringify({
          identifier: email.trim(),
          role: role,
        }),
      });

      // Store details for OTP page
      sessionStorage.setItem(
        "forgotPasswordIdentifier",
        email.trim()
      );

      sessionStorage.setItem(
        "forgotPasswordRole",
        role
      );

      // IMPORTANT: Start the 2-minute timer
      sessionStorage.setItem(
        "forgotPasswordOtpSentAt",
        Date.now().toString()
      );

      // Go to OTP page
      navigate("/forgot-password-otp");

    } catch (error) {
      console.error("Forgot password error:", error);

      setError(
        error.message ||
        "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="splash">
      
      <div className="brand-mark">
        <img
          src={logo}
          alt="MATCHO"
          className="brand-logo"
        />
      </div>

      <div className="splash-copy">

        <img
          src={forgetimage}
          alt="Forgot Password"
          className="forget-image"
        />

        <h1>Forgot Password?</h1>

        <p>
          No worries! Enter your email address and we'll
          send you a verification code to reset your password.
        </p>

      </div>

      <form
        className="reset-password-container"
        onSubmit={handleSubmit}
      >

        <div className="email-input-wrapper">

          <FiMail className="email-icon" />

          <input
            className="auth-input"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            required
            disabled={loading}
          />

        </div>


        {error && (
          <p className="otp-error">
            {error}
          </p>
        )}

        <button
          className="primary-action"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Sending OTP..."
            : "Send OTP"}
        </button>

      </form>
    </section>
  );
}