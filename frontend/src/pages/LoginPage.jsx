import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoginHeader from '../components/auth/LoginHeader';
import LoginForm from '../components/auth/LoginForm';
import LoginVisualPanel from '../components/auth/LoginVisualPanel';

export default function LoginPage() {
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
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-center px-12 sm:px-16 lg:px-24">
        <div className="w-full max-w-lg mx-auto flex flex-col justify-center">
          <LoginHeader mode={mode} />
          <LoginForm mode={mode} setMode={setMode} />
        </div>
      </div>

      {/* Right Visual Panel - 60% */}
      <LoginVisualPanel />
    </div>
  );
}
