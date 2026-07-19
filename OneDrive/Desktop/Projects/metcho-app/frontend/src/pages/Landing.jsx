import { Link } from 'react-router-dom'
import logo from '../assets/images/logo.png'

export default function Landing() {
  return (
    <section className="splash" aria-label="Matcho sports platform">
      <div className="brand-mark">
        <img className="brand-logo" src={logo} alt="MATCHO" />
      </div>

      <div className="splash-copy">
        <h1>
          Every Match.
          <br />
          One Platform.
          <br />
          Endless Champions.
        </h1>
      </div>

      <div className="auth-actions">
        <Link className="primary-action" to="/signup">
          Get Started
        </Link>
        <p>Already have an account?</p>
        <Link to="/signin">Sign in</Link>
      </div>
    </section>
  )
}