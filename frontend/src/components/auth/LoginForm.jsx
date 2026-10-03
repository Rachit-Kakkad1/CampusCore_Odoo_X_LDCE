// frontend/src/components/auth/LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EmailField from './EmailField';
import PasswordField from './PasswordField';
import LoginOptions from './LoginOptions';
import AuthErrorMessage from './AuthErrorMessage';
import LoginButton from './LoginButton';
import authService from '../../services/auth.service';

const DB_ACCOUNTS = [
  { role: 'Admin', email: 'admin@odoo-ldce.org', desc: 'Full Admin Privileges' },
  { role: 'Treasurer', email: 'tara@odoo-ldce.org', desc: 'Finance & Ledger' },
  { role: 'Event Mgr', email: 'ethan@odoo-ldce.org', desc: 'Events & Tickets' },
  { role: 'Volunteer', email: 'vik@odoo-ldce.org', desc: 'Tasks & Check-in' },
  { role: 'Active Member', email: 'maya@odoo-ldce.org', desc: 'Active Dues & Pass' },
  { role: 'Expired Member', email: 'eddie@odoo-ldce.org', desc: 'Past Dues Expired' },
  { role: 'Cancelled Member', email: 'greg@odoo-ldce.org', desc: 'Cancelled Record' },
  { role: 'Pending Member', email: 'pia@odoo-ldce.org', desc: 'Pending Payment' },
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
    setPassword('password123'); // Default password from database seeds
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
      {/* Database Seed Accounts Selector */}
      <div className="space-y-3 mb-6 p-4 border border-border bg-card/60 rounded-[2px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted">
            Database Seed Accounts
          </span>
          <span className="font-mono text-[9px] text-primary font-bold bg-primary/10 px-2 py-0.5 border border-primary/20">
            Pass: password123
          </span>
        </div>

        {/* Account chips */}
        <div className="flex flex-wrap gap-1.5">
          {DB_ACCOUNTS.map((acc) => {
            const isSelected = email === acc.email;
            return (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillDemoAccount(acc)}
                className={`font-mono text-[9px] uppercase tracking-wider px-2 py-1 border transition-all ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm font-bold'
                    : 'bg-background hover:bg-hover border-border text-muted hover:text-foreground hover:border-primary/50'
                }`}
                title={`${acc.email} — ${acc.desc}`}
              >
                {acc.role}
              </button>
            );
          })}
        </div>

        {/* Selected or Hovered Account Info */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between font-mono text-[10px]">
          <span className="text-muted">Account Email:</span>
          <span className="text-foreground font-semibold select-all">
            {email || 'Click any role above to autofill'}
          </span>
        </div>
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
      </form>
    </div>
  );
}
