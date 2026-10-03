import React from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function LoginOptions({ rememberMe, setRememberMe }) {
  return (
    <div className="flex items-center justify-between mb-4 mt-2">
      <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
        <div className={twMerge(
          "w-4 h-4 border transition-colors flex items-center justify-center",
          rememberMe ? "bg-primary border-primary" : "border-border bg-transparent group-hover:border-primary/50"
        )}>
          {rememberMe && <Check className="w-3 h-3 text-white" />}
        </div>
        <span className="font-mono text-xs text-muted uppercase tracking-widest">Remember me</span>
      </label>
      
      <button type="button" className="font-mono text-[10px] text-muted uppercase tracking-widest hover:text-primary transition-colors">
        Forgot password?
      </button>
    </div>
  );
}
