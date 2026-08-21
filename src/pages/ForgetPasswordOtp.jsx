import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import logo from "../assets/images/logo.png";

export default function ForgotPasswordOtp() {
  const navigate = useNavigate();

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);

  // =========================================================
  // FORGOT PASSWORD INFORMATION
  // =========================================================

  const identifier =
    sessionStorage.getItem(
      "forgotPasswordIdentifier"
    );

  // IMPORTANT:
  // There is no Player role anymore.
  // Forgot password is only for Organizers.
  const role = "Organizer";

  // Keep session storage consistent with the new flow.
  useEffect(() => {
    sessionStorage.setItem(
      "forgotPasswordRole",
      "Organizer"
    );
  }, []);

  // =========================================================
  // TIMER
  // =========================================================

  useEffect(() => {
    const sentAt =
      sessionStorage.getItem(
        "forgotPasswordOtpSentAt"
      );

    if (!sentAt) {
      setSecondsLeft(0);
      return;
    }

    const calculateRemaining = () => {
      const elapsed = Math.floor(
        (Date.now() - Number(sentAt)) / 1000
      );

      return Math.max(120 - elapsed, 0);
    };

    setSecondsLeft(calculateRemaining());

    const timer = setInterval(() => {
      const remaining =
        calculateRemaining();

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================================================
  // FORMAT TIMER
  // =========================================================

  const formatTime = (seconds) => {
    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // =========================================================
  // OTP INPUT
  // =========================================================

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) {
      return;
    }

    const newOtp = [...otp];

    newOtp[index] = value;

    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      document
        .getElementById(
          `forgot-otp-${index + 1}`
        )
        ?.focus();
    }
  };

  // =========================================================
  // BACKSPACE
  // =========================================================

  const handleKeyDown = (event, index) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      document
        .getElementById(
          `forgot-otp-${index - 1}`
        )
        ?.focus();
    }
  };

  // =========================================================
  // VERIFY OTP
  // =========================================================

  async function handleSubmit(e) {
    e.preventDefault();

    const enteredOtp =
      otp.join("").trim();

    if (enteredOtp.length !== 6) {
      setError(
        "Please enter the complete 6-digit code."
      );
      return;
    }

    if (!identifier) {
      setError(
        "Your email information is missing. Please request a new OTP."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      await apiRequest(
        "/auth/forgot-password/verify-otp",
        {
          method: "POST",

          body: JSON.stringify({
            identifier: identifier,
            role: "Organizer",
            otp: enteredOtp,
          }),
        }
      );

      sessionStorage.setItem(
        "forgotPasswordOtpVerified",
        "true"
      );

      // Make absolutely sure the next page knows
      // this is an Organizer password reset.
      sessionStorage.setItem(
        "forgotPasswordRole",
        "Organizer"
      );

      navigate("/reset-password");

    } catch (error) {
      console.error(
        "Verify forgot password OTP:",
        error
      );

      setError(
        error?.message ||
          "OTP verification failed."
      );

    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // RESEND OTP
  // =========================================================

  async function handleResend() {
    if (
      secondsLeft > 0 ||
      resending
    ) {
      return;
    }

    if (!identifier) {
      setError(
        "Your email information is missing. Please go back and request a new OTP."
      );
      return;
    }

    try {
      setResending(true);
      setError("");

      console.log(
        "Resending Organizer forgot-password OTP"
      );

      console.log(
        "Identifier:",
        identifier
      );

      console.log(
        "Role:",
        "Organizer"
      );

      // IMPORTANT:
      // Send only the fields required by the
      // forgot-password endpoint.
      const response =
        await apiRequest(
          "/auth/forgot-password/send-otp",
          {
            method: "POST",

            body: JSON.stringify({
              identifier: identifier,
              role: "Organizer",
            }),
          }
        );

      console.log(
        "Resend OTP response:",
        response
      );

      // Reset timer
      const now = Date.now();

      sessionStorage.setItem(
        "forgotPasswordOtpSentAt",
        now.toString()
      );

      // Keep role consistent
      sessionStorage.setItem(
        "forgotPasswordRole",
        "Organizer"
      );

      setSecondsLeft(120);

      // Clear old OTP
      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      // Focus first box
      setTimeout(() => {
        document
          .getElementById(
            "forgot-otp-0"
          )
          ?.focus();
      }, 100);

    } catch (error) {
      console.error(
        "Resend forgot password OTP:",
        error
      );

      setError(
        error?.message ||
          "Unable to resend OTP."
      );

    } finally {
      setResending(false);
    }
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <section
      className="splash"
      aria-label="Forgot password OTP verification"
    >

      {/* LOGO */}

      <div className="brand-mark-login">
        <img
          src={logo}
          alt="MATCHO"
          className="brand-logo"
        />
      </div>

      {/* HEADING */}

      <div className="splash-copy">

        <h1>OTP Verification</h1>

        <p>
          We've sent a 6-digit verification code
          to your organizer email address.
        </p>

      </div>

      {/* FORM */}

      <form
        className="otp-container"
        onSubmit={handleSubmit}
      >

        {/* OTP BOXES */}

        <div className="otp-inputs">

          {otp.map((digit, index) => (

            <input
              key={index}
              id={`forgot-otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) =>
                handleChange(
                  index,
                  e.target.value
                )
              }
              onKeyDown={(e) =>
                handleKeyDown(
                  e,
                  index
                )
              }
              className="otp-box"
              autoComplete="one-time-code"
              disabled={loading}
            />

          ))}

        </div>

        {/* ERROR */}

        {error && (
          <p className="otp-error">
            {error}
          </p>
        )}

        {/* VERIFY */}

        <button
          className="primary-action"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Verifying..."
            : "Verify OTP"}
        </button>

        {/* RESEND */}

        <p className="resend-text">

          {secondsLeft > 0 ? (
            <>
              Didn't receive the code?{" "}

              <span className="resend-timer">
                Resend OTP in{" "}
                {formatTime(
                  secondsLeft
                )}
              </span>
            </>
          ) : (
            <>
              Didn't receive the code?{" "}

              <button
                type="button"
                className="resend-button"
                onClick={handleResend}
                disabled={resending}
              >
                {resending
                  ? "Sending..."
                  : "Resend OTP"}
              </button>
            </>
          )}

        </p>

      </form>

    </section>
  );
}