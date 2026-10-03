import React, { useState } from 'react';
import EmailField from './EmailField';
import PasswordField from './PasswordField';
import LoginOptions from './LoginOptions';
import AuthErrorMessage from './AuthErrorMessage';
import LoginButton from './LoginButton';
import { loginUser } from '../../services/authService';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@example.com' },
  { label: 'Treasurer', email: 'treasurer@example.com' },
  { label: 'Event Mgr', email: 'events@example.com' },
  { label: 'Volunteer', email: 'volunteer@example.com' },
  { label: 'Member', email: 'member@example.com' },
];

export default function LoginForm() {
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
      const data = await loginUser({ email, password });
      console.log("Logged in successfully", data);
      // Store token and navigate here in the future
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
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
        
        <EmailField value={email} onChange={setEmail} />
        <PasswordField value={password} onChange={setPassword} />
        <LoginOptions rememberMe={rememberMe} setRememberMe={setRememberMe} />
        
        <LoginButton isLoading={isLoading} />
      </form>
    </div>
  );
}
