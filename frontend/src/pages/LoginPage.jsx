import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoginHeader from '../components/auth/LoginHeader';
import LoginForm from '../components/auth/LoginForm';
import LoginVisualPanel from '../components/auth/LoginVisualPanel';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setMode('register');
    } else {
      setMode('login');
    }
  }, [searchParams]);

  return (
    <div className="h-screen w-full bg-background flex overflow-hidden selection:bg-primary selection:text-white">
      {/* Left Panel - 50% */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-between overflow-y-auto py-8 px-12 sm:px-16 lg:px-24">
        {/* Top Back Action Button */}
        <div>
          <button
            type="button"
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted hover:text-primary transition-all cursor-pointer py-1.5 px-3 rounded-sm hover:bg-hover border border-border/60 hover:border-border shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>

        <div className="w-full max-w-lg mx-auto flex flex-col justify-center my-auto">
          <LoginHeader mode={mode} />
          <LoginForm mode={mode} setMode={setMode} />
        </div>

        {/* Footer info */}
        <div className="font-mono text-[10px] text-muted tracking-wider pt-4">
          CampusCore Student Organization · 2026
        </div>
      </div>

      {/* Right Visual Panel */}
      <LoginVisualPanel />
    </div>
  );
}
