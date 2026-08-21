import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import logo from "../assets/images/logo.png";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    // -----------------------------
    // Validate password
    // -----------------------------

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // -----------------------------
    // Get forgot-password details
    // -----------------------------

    const identifier = sessionStorage.getItem(
      "forgotPasswordIdentifier"
    );

    const role = sessionStorage.getItem(
      "forgotPasswordRole"
    );

    const otpVerified = sessionStorage.getItem(
      "forgotPasswordOtpVerified"
    );

    if (!identifier || !role || otpVerified !== "true") {
      setError(
        "Your password reset session has expired. Please try again."
      );
      return;
    }

    try {
      setLoading(true);

      // -----------------------------
      // Send new password to backend
      // -----------------------------

      await apiRequest(
        "/auth/forgot-password/reset-password",
        {
          method: "POST",
          body: JSON.stringify({
            identifier,
            role,
            password,
          }),
        }
      );

      // -----------------------------
      // Clear reset session
      // -----------------------------

      sessionStorage.removeItem(
        "forgotPasswordIdentifier"
      );

      sessionStorage.removeItem(
        "forgotPasswordRole"
      );

      sessionStorage.removeItem(
        "forgotPasswordOtpVerified"
      );

      sessionStorage.removeItem(
        "forgotPasswordOtpSentAt"
      );

      setSuccess(true);

    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      setError(
        error.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------
  // SUCCESS UI
  // --------------------------------

  if (success) {
    return (
      <section
        className="splash"
        aria-label="Password reset successful"
      >
        <div className="brand-mark">
          <img
            className="brand-logo"
            src={logo}
            alt="MATCHO"
          />
        </div>

        <div className="registration-success">
          <div className="success-icon">
            ✓
          </div>

          <div className="splash-copy">
            <h1>Password Reset Successfully!</h1>

            <p>
              Your password has been updated successfully.
              <br />
              You can now sign in with your new password.
            </p>
          </div>

          <button
            className="primary-action"
            type="button"
            onClick={() => navigate("/signin")}
          >
            Continue to Sign In
          </button>
        </div>
      </section>
    );
  }

  // --------------------------------
  // RESET PASSWORD UI
  // --------------------------------

  return (
    <section
      className="splash"
      aria-label="Reset your Matcho password"
    >
      <div className="brand-mark">
        <img
          className="brand-logo"
          src={logo}
          alt="MATCHO"
        />
      </div>

      <div className="splash-copy">
        <h1>Set New Password</h1>

        <p>
          Create a new password for your Matcho account.
        </p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        {/* PASSWORD */}

        <div className="password-container">
          <input
            className="auth-input"
            type={
              showPassword
                ? "text"
                : "password"
            }
            placeholder="New Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
            disabled={loading}
          />

          <span
            className="eye-icon"
            onClick={() =>
              setShowPassword(
                (prev) => !prev
              )
            }
          >
            {showPassword ? (
              <FiEyeOff />
            ) : (
              <FiEye />
            )}
          </span>
        </div>

        {/* CONFIRM PASSWORD */}

        <div className="password-container">
          <input
            className="auth-input"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(
                e.target.value
              )
            }
            required
            disabled={loading}
          />

          <span
            className="eye-icon"
            onClick={() =>
              setShowConfirmPassword(
                (prev) => !prev
              )
            }
          >
            {showConfirmPassword ? (
              <FiEyeOff />
            ) : (
              <FiEye />
            )}
          </span>
        </div>

        {/* ERROR */}

        {error && (
          <p className="otp-error">
            {error}
          </p>
        )}

        {/* BUTTON */}

        <button
          className="primary-action"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Updating Password..."
            : "Reset Password"}
        </button>
      </form>
    </section>
  );
}