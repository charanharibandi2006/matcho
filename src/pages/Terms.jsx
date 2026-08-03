import { Link } from "react-router-dom";
import logo from "../assets/images/logo.png";

export default function Terms() {
  return (
    <section className="splash" aria-label="Matcho Terms & Conditions">
      <div className="brand-mark">
        <img className="brand-logo" src={logo} alt="MATCHO" />
      </div>

      <div className="splash-copy">
        <h1>Terms &amp; Conditions</h1>
        <p>
          By creating a Matcho account you agree to use the platform
          responsibly, provide accurate registration details, and follow
          each tournament organizer's rules of play. Full terms will be
          published here soon.
        </p>
      </div>

      <p className="signup-text">
        <Link to="/signup">Back to Sign Up</Link>
      </p>
    </section>
  );
}
