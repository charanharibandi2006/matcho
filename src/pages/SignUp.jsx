import { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "../services/api";

import logo from "../assets/images/logo.png";

import { FiEye, FiEyeOff } from "react-icons/fi";

export default function SignUp() {
  const navigate = useNavigate();

  const SIGNUP_DRAFT_KEY = "matcho_signup_draft";

  // =====================================================
  // LOAD SAVED SIGNUP DATA
  // =====================================================

  const getSavedDraft = () => {
    try {
      const savedDraft = sessionStorage.getItem(
        SIGNUP_DRAFT_KEY
      );

      if (!savedDraft) {
        return {};
      }

      return JSON.parse(savedDraft);
    } catch (error) {
      console.error(
        "Failed to read signup draft:",
        error
      );

      return {};
    }
  };

  const savedDraft = getSavedDraft();

  // =====================================================
  // FORM STATE
  // =====================================================

  const [fullName, setFullName] = useState(
    savedDraft.fullName || ""
  );

  const [email, setEmail] = useState(
    savedDraft.email || ""
  );

  const [phoneNumber, setPhoneNumber] = useState(
    savedDraft.phoneNumber || ""
  );

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [agree, setAgree] = useState(
    Boolean(savedDraft.agree)
  );

  // =====================================================
  // SAVE SIGNUP DRAFT
  //
  // Passwords are intentionally NOT stored.
  // =====================================================

  useEffect(() => {
    sessionStorage.setItem(
      SIGNUP_DRAFT_KEY,
      JSON.stringify({
        fullName,
        email,
        phoneNumber,
        agree,
      })
    );
  }, [
    fullName,
    email,
    phoneNumber,
    agree,
  ]);

  // =====================================================
  // SUBMIT
  // =====================================================

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!agree) {
      setError(
        "Please accept Terms & Conditions"
      );
      return;
    }

    // -----------------------------
    // BACKEND ROLE
    // -----------------------------

    const backendRole = "Organizer";

    try {
      setLoading(true);

      // -----------------------------
      // SEND OTP
      // -----------------------------

      const role = "Organizer";

      const result = await apiRequest(
        "/auth/register/send-otp",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            phone: phoneNumber.trim(),
            password,
            role: backendRole,
          }),
        }
      );

      console.log(
        "OTP response:",
        result
      );

      // -----------------------------
      // STORE EMAIL FOR OTP PAGE
      // -----------------------------

      sessionStorage.setItem(
        "pendingSignupEmail",
        email.trim()
      );

      sessionStorage.setItem(
        "pendingSignupRole",
        role
      );

      // -----------------------------
      // START 2-MINUTE TIMER
      // -----------------------------

      sessionStorage.setItem(
        "otpSentAt",
        Date.now().toString()
      );

      // -----------------------------
      // GO TO OTP PAGE
      // -----------------------------

      navigate("/otp-verification");
    } catch (error) {
      console.error(
        "Signup error:",
        error
      );

      setError(
        error.message ||
          "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <section
      className="splash"
      aria-label="Create your Matcho account"
    >
      {/* Logo */}

      <div className="brand-mark-login">
        <img
          className="brand-logo"
          src={logo}
          alt="MATCHO"
        />
      </div>

      {/* Heading */}

      <div className="splash-copy">
        <h1>Create Account</h1>

        <p>
          Create an organizer account to manage
          your tournaments
        </p>
      </div>

      {/* Signup Form */}

      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        {/* Full Name */}

        <input
          className="auth-input"
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) =>
            setFullName(e.target.value)
          }
          required
        />

        {/* Email */}

        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        {/* Phone Number */}

        <input
          className="auth-input"
          type="tel"
          placeholder="Phone Number"
          value={phoneNumber}
          onChange={(e) =>
            setPhoneNumber(e.target.value)
          }
          required
        />

        {/* Password */}

        <div className="password-container">
          <input
            className="auth-input"
            type={
              showPassword
                ? "text"
                : "password"
            }
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <button
            type="button"
            className="eye-icon"
            onClick={() =>
              setShowPassword(
                (prev) => !prev
              )
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword ? (
              <FiEyeOff />
            ) : (
              <FiEye />
            )}
          </button>
        </div>

        {/* Confirm Password */}

        <div className="password-container">
          <input
            className="auth-input"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(
                e.target.value
              )
            }
            required
          />

          <button
            type="button"
            className="eye-icon"
            onClick={() =>
              setShowConfirmPassword(
                (prev) => !prev
              )
            }
            aria-label={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            {showConfirmPassword ? (
              <FiEyeOff />
            ) : (
              <FiEye />
            )}
          </button>
        </div>

        {/* Error */}

        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

        {/* Terms */}

        <label className="terms">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) =>
              setAgree(
                e.target.checked
              )
            }
          />

          <span>
            I agree to{" "}
            <Link to="/terms">
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link to="/privacy">
              Privacy Policy
            </Link>
          </span>
        </label>

        {/* Signup Button */}

        <button
          className="primary-action"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Sending OTP..."
            : "Sign Up"}
        </button>
      </form>

      {/* Sign In */}

      <p className="signup-text">
        Already have an account?{" "}
        <Link to="/signin">
          Sign In
        </Link>
      </p>
    </section>
  );
}