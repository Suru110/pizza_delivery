import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ShieldAlert, Key, CheckCircle, ArrowLeft } from 'lucide-react';

export default function Auth({ onLoginSuccess, initialView = 'login', API_URL }) {
  const [view, setView] = useState(initialView); // 'login', 'register', 'verify', 'forgot', 'reset'
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // New role state for registration
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [devCode, setDevCode] = useState(''); // shown in UI when no email configured
  
  // Feedback states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync view when navbar button changes it
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  // Check if URL has token for password reset
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const emailParam = params.get('email');
    
    if (token) {
      setView('reset');
      setResetToken(token);
      // Clean query params so user doesn't get stuck on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (emailParam && params.get('verify') === 'true') {
      setView('verify');
      setEmail(emailParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Registration failed');
      
      setSuccess(data.message);
      if (data.devCode) {
        setDevCode(data.devCode);
        setCode(data.devCode); // auto-fill the code input
      }
      setView('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          setView('verify');
          setEmail(data.email);
          throw new Error('Your email is not verified yet. A verification code has been sent.');
        }
        throw new Error(data.message || 'Login failed');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: code }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Verification failed');

      setSuccess('Verification successful!');
      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to resend code');

      setSuccess('A new code has been sent to your email.');
      if (data.devCode) {
        setDevCode(data.devCode);
        setCode(data.devCode);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to request reset link');

      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Reset failed');

      setSuccess(data.message);
      setTimeout(() => {
        setView('login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper fade-in">
      <div className="auth-card glass-card">
        {/* Card Header */}
        <div className="auth-header">
          {view === 'forgot' || view === 'verify' || view === 'reset' ? (
            <button className="back-btn" onClick={() => setView('login')} title="Back to Login">
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <h2 className="serif-title">
            {view === 'login' && 'Welcome Back'}
            {view === 'register' && 'Create Account'}
            {view === 'verify' && 'Verify Email'}
            {view === 'forgot' && 'Reset Password'}
            {view === 'reset' && 'New Password'}
          </h2>
          <p className="auth-subtitle">
            {view === 'login' && 'Log in to satisfy your pizza cravings'}
            {view === 'register' && 'Join the ultimate custom pizza experience'}
            {view === 'verify' && `We sent a 6-digit code to ${email}`}
            {view === 'forgot' && 'Enter your email to receive a password reset link'}
            {view === 'reset' && 'Set a new password for your account'}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="alert alert-error">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* Form rendering */}
        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">Password</label>
                <button
                  type="button"
                  className="text-btn text-xs"
                  onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <div className="spinner" /> : 'Sign In'}
            </button>
            <p className="auth-footer-text">
              Don't have an account?{' '}
              <button
                type="button"
                className="text-btn"
                onClick={() => { setView('register'); setError(''); setSuccess(''); }}
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-control"
                  placeholder="John Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  className="form-control"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group role-selection">
              <label className="form-label">Account Type</label>
              <div className="radio-group">
                <label className={`radio-label ${role === 'user' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={role === 'user'}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  User
                </label>
                <label className={`radio-label ${role === 'admin' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  Admin
                </label>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <div className="spinner" /> : 'Register'}
            </button>
            <p className="auth-footer-text">
              Already have an account?{' '}
              <button
                type="button"
                className="text-btn"
                onClick={() => { setView('login'); setError(''); setSuccess(''); }}
              >
                Log in
              </button>
            </p>
          </form>
        )}

        {view === 'verify' && (
          <form onSubmit={handleVerify}>
            {devCode && (
              <div className="dev-code-box">
                <div className="dev-code-label">⚡ Dev Mode — Your Verification Code</div>
                <div className="dev-code-value">{devCode}</div>
                <div className="dev-code-hint">Code auto-filled below. Configure EMAIL_USER &amp; EMAIL_PASS in backend/.env for real emails.</div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <div className="input-with-icon">
                <Key size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-control center-text letter-spacing-lg"
                  placeholder="000000"
                  required
                  maxLength={6}
                  minLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <div className="spinner" /> : 'Verify Code'}
            </button>
            <div className="flex-center mt-4">
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgot}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <div className="spinner" /> : 'Send Reset Link'}
            </button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  className="form-control"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <div className="spinner" /> : 'Update Password'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .auth-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 160px);
          padding: 1.5rem;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          position: relative;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .back-btn {
          position: absolute;
          left: 1.5rem;
          top: 1.5rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-light);
        }

        .back-btn:hover {
          color: var(--primary);
          border-color: var(--primary);
        }

        .auth-header h2 {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #fff, var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .auth-subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-with-icon .form-control {
          padding-left: 2.75rem;
        }

        .text-btn {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: var(--transition-fast);
        }

        .text-btn:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        .text-xs {
          font-size: 0.8rem;
        }

        .auth-footer-text {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          line-height: 1.4;
        }

        .alert-error {
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.2);
          color: var(--danger);
        }

        .alert-success {
          background: rgba(40, 167, 69, 0.1);
          border: 1px solid rgba(40, 167, 69, 0.2);
          color: var(--success);
        }

        .w-full {
          width: 100%;
        }

        .mt-4 {
          margin-top: 1rem;
        }

        .center-text {
          text-align: center;
        }

        .letter-spacing-lg {
          letter-spacing: 0.25em;
        }

        /* Dev-mode verification code display */
        .dev-code-box {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.08), rgba(247, 197, 159, 0.05));
          border: 1.5px dashed var(--primary);
          border-radius: var(--radius-sm);
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .dev-code-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .dev-code-value {
          font-size: 2.25rem;
          font-weight: 800;
          letter-spacing: 0.35em;
          color: var(--text-primary);
          font-family: 'Courier New', monospace;
          margin-bottom: 0.4rem;
        }

        .dev-code-hint {
          font-size: 0.72rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        /* Role Selection Radio Buttons */
        .role-selection {
          margin-bottom: 1.5rem;
        }
        
        .radio-group {
          display: flex;
          gap: 1rem;
        }
        
        .radio-label {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition-fast);
          color: var(--text-secondary);
          font-weight: 500;
        }
        
        .radio-label:hover {
          border-color: var(--primary);
          color: var(--text-primary);
        }
        
        .radio-label.selected {
          border-color: var(--primary);
          background: rgba(255, 107, 53, 0.1);
          color: var(--primary);
        }
        
        .radio-label input[type="radio"] {
          display: none;
        }
      `}</style>
    </div>
  );
}
