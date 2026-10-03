// frontend/src/components/auth/LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EmailField from './EmailField';
import PasswordField from './PasswordField';
import LoginOptions from './LoginOptions';
import AuthErrorMessage from './AuthErrorMessage';
import LoginButton from './LoginButton';
import authService from '../../services/auth.service';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@skyline.org' },
  { label: 'Treasurer', email: 'tara@skyline.org' },
  { label: 'Event Mgr', email: 'ethan@skyline.org' },
  { label: 'Volunteer', email: 'vik@skyline.org' },
  { label: 'Active Member', email: 'maya@skyline.org' },
  { label: 'Expired Member', email: 'eddie@skyline.org' },
];

export default function LoginForm({ mode, setMode }) {
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fillDemoAccount = (acc) => {
    setEmail(acc.email);
    setPassword('password123'); // Default password from backend seeds
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegister) {
        if (!name) {
          throw new Error("Please provide your name.");
        }
        await authService.register({ name, email, password });
      } else {
        await authService.login({ email, password });
      }
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || (isRegister ? 'Registration failed.' : 'Invalid email or password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Role Switcher for Hackathon Demo */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="w-full font-mono text-[9px] uppercase tracking-widest text-muted">
          Quick Demo Accounts:
        </span>
        {DEMO_ACCOUNTS.map((acc) => (
          <button
            key={acc.label}
            type="button"
            onClick={() => fillDemoAccount(acc)}
            className="font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 border border-border bg-background hover:bg-hover hover:border-primary text-muted hover:text-foreground transition-all duration-700 focus:outline-none"
          >
            {acc.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <AuthErrorMessage message={error} />
        {isRegister && (
          <div className="mb-3">
            <label className="block font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted mb-2">
              FULL NAME
            </label>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-transparent border-b border-border py-2 text-base text-foreground font-sans outline-none focus:border-primary transition-colors placeholder:text-border"
              placeholder="Maya Sharma"
            />
          </div>
        )}

        <EmailField value={email} onChange={setEmail} />
        <PasswordField value={password} onChange={setPassword} />
        {!isRegister && <LoginOptions rememberMe={rememberMe} setRememberMe={setRememberMe} />}
        <LoginButton isLoading={isLoading} />
        
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register');
              setError('');
            }}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-primary transition-colors"
          >
            {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register"}
          </button>
        </div>
      </form>
    </div>
  );
}
