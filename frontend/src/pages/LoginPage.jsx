import React from 'react';
import LoginHeader from '../components/auth/LoginHeader';
import LoginForm from '../components/auth/LoginForm';
import LoginVisualPanel from '../components/auth/LoginVisualPanel';

export default function LoginPage() {
  return (
    <div className="h-screen w-full bg-background flex overflow-hidden selection:bg-primary selection:text-white">
      {/* Left Panel - 50% */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-center px-12 sm:px-16 lg:px-24">
        <div className="w-full max-w-lg mx-auto flex flex-col justify-center">
          <LoginHeader />
          <LoginForm />
        </div>
      </div>

      {/* Right Visual Panel - 60% */}
      <LoginVisualPanel />
    </div>
  );
}
