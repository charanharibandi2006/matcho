import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import logo from "../assets/images/logo.png";


import {
  FiEye,
  FiEyeOff,
} from "react-icons/fi";


import {
  setRole,
} from "../utils/auth";

import {
  apiRequest,
} from "../services/api";

export default function SignIn() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);
const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    try {
      setLoading(true);

      const result =
        await apiRequest(
          "/auth/login",
          {
            method: "POST",

            body: JSON.stringify({
              identifier,
              password,

              role: "Organizer",
            }),
          }
        );

      // =========================================
      // SAVE AUTHENTICATION INFORMATION
      // =========================================

      localStorage.setItem(
        "matcho_token",
        result.token
      );

      localStorage.setItem(
        "matcho_user",
        JSON.stringify(
          result.user
        )
      );

      // =========================================
      // GET ROLE FROM BACKEND
      // =========================================

      const backendRole =
        result.user.role;

      // Keep compatibility with
      // existing components.
      localStorage.setItem(
        "matcho_role",
        backendRole ===
          "Organizer"
          ? "organizer"
          : backendRole ===
            "Player"
          ? "player"
          : "score-viewing"
      );

      // =========================================
      // REDIRECT BY ROLE
      // =========================================

      if (backendRole === "Organizer") {
        setRole("organizer");
        navigate("/organizer-dashboard");
      } else {
        setError("Only organizer accounts can sign in.");
      }

    } catch (error) {
      setError(
        error.message ||
          "Invalid email/phone or password."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-container">

      {/* =========================================
          LOGO
      ========================================= */}

      <div className="brand-mark">
        <img
          className="brand-logo"
          src={logo}
          alt="MATCHO"
        />
      </div>

      {/* =========================================
          HEADING
      ========================================= */}

      <div className="splash-copy">
        <h1>
          Welcome Back!
        </h1>

        <p>
          Login to continue
        </p>
      </div>

      {/* =========================================
          LOGIN FORM
      ========================================= */}

      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
{/* Email / Phone */}

        <input
          className="auth-input"
          type="text"
          placeholder="Email or Phone number"
          value={identifier}
          onChange={(e) =>
            setIdentifier(
              e.target.value
            )
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
              setPassword(
                e.target.value
              )
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

        {/* Forgot Password */}

        <div className="forgot-password">

          <Link to="/enter-email">
            Forgot Password?
          </Link>

        </div>

        {/* Error */}

        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

        {/* Login */}

        <button
          type="submit"
          className="primary-action"
          disabled={loading}
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </button>

      </form>

      {/* =========================================
          SIGN UP
      ========================================= */}

      <p className="signup-text">

        Don't have an account?{" "}

        <Link to="/signup">
          Sign Up
        </Link>

      </p>

    </section>
  );
}