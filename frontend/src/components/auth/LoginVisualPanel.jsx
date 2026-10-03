import React from 'react';
import loginImage from '../../assests/login/Student Organization System Illustration.png';

export default function LoginVisualPanel() {
  return (
    <div className="hidden lg:block w-1/2 h-screen relative bg-background overflow-hidden">
      <img 
        src={loginImage} 
        alt="Student Organization" 
        className="w-full h-full object-cover relative z-10"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      
      <div className="absolute inset-0 bg-primary/5 mix-blend-multiply pointer-events-none z-20" />
    </div>
  );
}
