import React, { useState } from 'react';
import EmailField from './EmailField';
import PasswordField from './PasswordField';
import LoginOptions from './LoginOptions';
import AuthErrorMessage from './AuthErrorMessage';
import LoginButton from './LoginButton';
import authService from '../../services/auth.service';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@example.com' },
  { label: 'Treasurer', email: 'treasurer@example.com' },
  { label: 'Event Mgr', email: 'events@example.com' },
  { label: 'Volunteer', email: 'volunteer@example.com' },
  { label: 'Member', email: 'member@example.com' },
];

export default function LoginForm({ mode, setMode }) {
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fillDemoAccount = (acc) => {
    setEmail(acc.email);
    setPassword('password123'); // Default password from backend seeds
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let data;
      if (isRegister) {
        if (!name) {
          throw new Error("Please provide your name.");
        }
        data = await authService.register({ name, email, password });
        console.log("Registered successfully", data);
      } else {
        data = await authService.login({ email, password });
        console.log("Logged in successfully", data);
      }
      // TODO: navigate to dashboard/membership after successful auth
    } catch (err) {
      setError(err.message || (isRegister ? 'Registration failed.' : 'Invalid email or password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Role Switcher for Hackathon Demo */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="w-full font-mono text-[9px] uppercase tracking-widest text-muted">Demo Roles:</span>
        {DEMO_ACCOUNTS.map(acc => (
          <button 
            key={acc.label}
            type="button"
            onClick={() => fillDemoAccount(acc)}
            className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 border border-border text-muted hover:border-primary hover:text-primary transition-colors focus:outline-none"
          >
            {acc.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="w-full">
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
