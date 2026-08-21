import { apiRequest } from "../services/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";

export default function OtpVerification() {
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
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [resending, setResending] = useState(false);

  // --------------------------------
  // 2 MINUTE OTP TIMER
  // --------------------------------
  useEffect(() => {
    const sentAt = sessionStorage.getItem("otpSentAt");

    if (!sentAt) {
      setSecondsLeft(120);
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
      const remaining = calculateRemaining();

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // --------------------------------
  // FORMAT TIMER
  // --------------------------------
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // --------------------------------
  // OTP INPUT
  // --------------------------------
  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;

    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      document
        .getElementById(`otp-${index + 1}`)
        ?.focus();
    }
  };

  // --------------------------------
  // BACKSPACE
  // --------------------------------
  const handleKeyDown = (event, index) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      document
        .getElementById(`otp-${index - 1}`)
        ?.focus();
    }
  };

  // --------------------------------
  // VERIFY OTP
  // --------------------------------
  async function handleSubmit(e) {
    e.preventDefault();

    if (otp.some((digit) => !digit)) {
      setError(
        "Please enter the complete 6-digit code."
      );
      return;
    }

    const email = sessionStorage.getItem(
      "pendingSignupEmail"
    );
const role = sessionStorage.getItem("pendingSignupRole");


    if (!email) {
      setError(
        "Registration session expired. Please sign up again."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      await apiRequest(
        "/auth/register/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            otp: otp.join(""),
          }),
        }
      );

      sessionStorage.removeItem(
        "pendingSignupEmail"
      );

      sessionStorage.removeItem("otpSentAt");

      setSuccess(true);
    } catch (error) {
      setError(
        error.message ||
          "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------
  // RESEND OTP
  // --------------------------------
  const handleResend = async () => {
    if (secondsLeft > 0 || resending) {
      return;
    }

    const email = sessionStorage.getItem(
      "pendingSignupEmail"
    );

    if (!email) {
      setError(
        "Registration session expired. Please sign up again."
      );
      return;
    }

    try {
      setResending(true);
      setError("");

      await apiRequest(
        "/auth/register/send-otp",
        {
          method: "POST",
          body: JSON.stringify({
            email,
          }),
        }
      );

      // Reset timer
      sessionStorage.setItem(
        "otpSentAt",
        Date.now().toString()
      );

      setSecondsLeft(120);

      // Clear previous OTP
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
          .getElementById("otp-0")
          ?.focus();
      }, 100);

    } catch (error) {
      setError(
        error.message ||
          "Unable to resend OTP."
      );
    } finally {
      setResending(false);
    }
  };

  // --------------------------------
  // UI
  // --------------------------------
  return (
    <section
      className="splash"
      aria-label="OTP verification"
    >
      <div className="brand-mark-login">
        <img
          src={logo}
          alt="MATCHO"
          className="brand-logo"
        />
      </div>

      {success ? (
        <div className="registration-success">
          <div className="success-icon">
            ✓
          </div>

          <div className="splash-copy">
            <h1>
              Account Created Successfully!
            </h1>

            <p>
              Welcome to Matcho.
              <br />
              Your account has been verified
              successfully.
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
      ) : (
        <>
          <div className="splash-copy">
            <h1>OTP Verification</h1>

            <p>
              We've sent a 6-digit verification
              code to your email address.
            </p>
          </div>

          <form
            className="otp-container"
            onSubmit={handleSubmit}
          >
            <div className="otp-inputs">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
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
                ? "Verifying..."
                : "Verify OTP"}
            </button>

            <p className="resend-text">
              {secondsLeft > 0 ? (
                <>
                  Didn't receive the code?{" "}
                  <span className="resend-timer">
                    Resend OTP in{" "}
                    {formatTime(secondsLeft)}
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
        </>
      )}
    </section>
  );
}