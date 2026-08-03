import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";

import { FaGoogle, FaFacebookF, FaApple } from "react-icons/fa";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function SignIn() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    console.log({
      identifier,
      password,
    });
    navigate("/dashboard");
  }

  return (
    <section className="splash-login">

      <div className="brand-mark">
        <img className="brand-logo" src={logo} alt="MATCHO" />
      </div>

      <div className="splash-copy">
        <h1>Welcome Back!</h1>
        <p>Login to continue</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>

        <input
          className="auth-input"
          type="text"
          placeholder="Email or Phone number"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <div className="password-container">
          <input
            className="auth-input"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <span
            className="eye-icon"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </span>
        </div>

        <div className="forgot-password">
          <Link to="/enter-email">
            Forgot Password?
          </Link>
        </div>

        <button className="primary-action">
          Login
        </button>

      </form>

      <div className="divider">
        <span>or continue with</span>
      </div>

      <div className="social-login">

        <button className="social-btn">
          <FaGoogle />
        </button>

        <button className="social-btn">
          <FaFacebookF />
        </button>

        <button className="social-btn">
          <FaApple />
        </button>

      </div>

      <p className="signup-text">
        Don't have an account?{" "}
        <Link to="/signup">
          Sign Up
        </Link>
      </p>

    </section>
  );
}