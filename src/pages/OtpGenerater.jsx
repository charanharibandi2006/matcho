import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";

export default function OtpVerification() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const code = otp.join("");
    console.log(code);
    navigate("/reset-password");
  };

  return (
    <section className="splash">
      <div className="brand-mark-login">
        <img src={logo} alt="MATCHO" className="brand-logo" />
      </div>

      <div className="splash-copy">
        <h1>OTP Verification</h1>

        <p>
          We've sent a 6-digit verification code to your email address.
        </p>
      </div>

      <form className="otp-container" onSubmit={handleSubmit}>
        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              className="otp-box"
            />
          ))}
        </div>

        <button className="primary-action" type="submit">
          Verify OTP
        </button>

        <p className="resend-text">
          Didn't receive the code?{" "}
          <Link to="/enter-email">Resend OTP</Link>
        </p>
      </form>
    </section>
  );
}
