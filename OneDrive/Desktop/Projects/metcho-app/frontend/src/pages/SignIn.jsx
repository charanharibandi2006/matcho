import { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/images/logo.png'

export default function SignIn() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // backend call goes here once server.js is built
    console.log({ identifier, password })
  }

  return (
    <section className="splash" aria-label="Sign in to Matcho">

        <div className="brand-mark-login">
                <img className="brand-logo" src={logo} alt="MATCHO" />
        </div>
        
      <div className="splash-copy">
        <h1>Welcome Back</h1>
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
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="primary-action" type="submit">
          Login
        </button>
      </form>

      <p>
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </section>
  )
}