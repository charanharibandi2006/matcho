import { Link } from "react-router-dom";
import logo from "../assets/images/logo.png";

export default function Privacy() {
  return (
    <section className="splash" aria-label="Matcho Privacy Policy">
      <div className="brand-mark">
        <img className="brand-logo" src={logo} alt="MATCHO" />
      </div>

      <div className="splash-copy">
        <h1>Privacy Policy</h1>
        <p>
          Matcho collects only the information needed to run tournaments and
          match your profile with organizers and players. We never sell
          your personal data. A full policy will be published here soon.
        </p>
      </div>

      <p className="signup-text">
        <Link to="/signup">Back to Sign Up</Link>
      </p>
    </section>
  );
}
