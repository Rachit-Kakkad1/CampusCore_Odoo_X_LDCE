import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ value, onChange }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mb-3 relative">
      <label className="block font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted mb-2">
        PASSWORD
      </label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="w-full bg-transparent border-b border-border py-2 text-base text-foreground font-sans outline-none focus:border-primary transition-colors placeholder:text-border pr-10"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
