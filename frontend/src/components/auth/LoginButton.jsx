import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function LoginButton({ isLoading }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="group relative overflow-hidden bg-primary text-white font-mono text-[10px] uppercase tracking-[0.25em] px-8 py-3 w-full transition-all duration-700 hover:tracking-[0.4em] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isLoading ? 'AUTHENTICATING...' : (
          <>SIGN IN <ArrowRight className="w-3 h-3" /></>
        )}
      </span>
      {!isLoading && (
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" />
      )}
    </button>
  );
}
