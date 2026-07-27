import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from './api';
import { Mail, Lock, Eye, EyeOff, User, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import heroImg from './assets/hero.png';
import dxcLogo from './assets/dxclogo.png';
import './login.css';

export default function Register() {
  const navigate                      = useNavigate();
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [role, setRole]               = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms]             = useState(false);
  const [message, setMessage]         = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(''); setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!terms) { setError('Please accept the Terms & Conditions.'); return; }
    setLoading(true);
    try {
      const { ok, data } = await registerUser(name, email, password, role);
      if (ok) {
        setMessage(data.message || 'Account created! Redirecting to login…');
        setTimeout(() => navigate('/login'), 1800);
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setError('Network error: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
     <div className="login-page-scope">
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-hero">
          <img src={heroImg} alt="" className="auth-hero-img" />
          <div className="auth-hero-logo">
            <span className="dxc-wordmark">DXC</span>
            <span className="logo-sub">TECH<br/>NOLOGY</span>
          </div>
          <div className="auth-hero-content">
            <h2>Delivering<br/>Excellence,<br/><em>Every Day.</em></h2>
            <p>Monitor SLA performance in real time and deliver exceptional service.</p>

          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-portal-badge">
            <img src={dxcLogo} alt="DXC Technology" className="auth-portal-logo" />
            <div>
              <div className="badge-text">Tunisia Web Portal</div>
              <div className="badge-sub">Impossible. Delivered.</div>
            </div>
          </div>

          <h2>Create Account</h2>
          
          {message && <p className="auth-msg-ok"><CheckCircle size={14}/> {message}</p>}
          {error   && <p className="auth-msg-error"><AlertCircle size={14}/> {error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field-row">
              <div className="auth-field-group">
                <label>Full Name</label>
                <div className="auth-field-wrap">
                  <span className="auth-field-icon"><User size={14}/></span>
                  <input type="text" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              </div>
              <div className="auth-field-group">
                <label>Email Address</label>
                <div className="auth-field-wrap">
                  <span className="auth-field-icon"><Mail size={14}/></span>
                  <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="auth-field-group">
              <label>Password</label>
              <div className="auth-field-wrap">
                <span className="auth-field-icon"><Lock size={14}/></span>
                <input type={showPwd ? 'text' : 'password'} placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="auth-eye-toggle" onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <div className="auth-field-group">
              <label>Confirm Password</label>
              <div className="auth-field-wrap">
                <span className="auth-field-icon"><Lock size={14}/></span>
                <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm your password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                <button type="button" className="auth-eye-toggle" onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <div className="auth-field-group">
              <label>Role</label>
              <div className="auth-field-wrap select-wrap">
                <span className="auth-field-icon"><ChevronDown size={14}/></span>
                <select value={role} onChange={e => setRole(e.target.value)} required style={{paddingRight:'32px'}}>
                  <option value="" disabled>Select your role</option>
                  <option value="agent">Agent</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="auth-check-row">
              <input id="terms" type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
              <label htmlFor="terms">I accept the <a href="#">Terms &amp; Conditions</a> and <a href="#">Privacy Policy</a></label>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">Already have an account? <Link to="/login">Login</Link></p>
        </div>

      </div>
    </div>
    </div>
  );
}