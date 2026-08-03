import { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/images/logo.png'

export default function SignUp() {
  const [fullName, setFullName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // backend call goes here once server.js is built
    console.log({ fullName, identifier, password })
  }

  return (
    <section className="splash" aria-label="Create your Matcho account">
        <div className="brand-mark-login">
                        <img className="brand-logo" src={logo} alt="MATCHO" />
        </div>
      <div className="splash-copy">
        <h1>Create Account</h1>
        <p>Join Matcho to get started</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          className="auth-input"
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
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
          Sign Up
        </button>
      </form>

      <p>
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </section>
  )
}