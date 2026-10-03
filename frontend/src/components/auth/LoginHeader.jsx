import React from 'react';
import logoEmblem from '../../assests/CampusCore Academic Emblem.png';

export default function LoginHeader({ mode }) {
  const isRegister = mode === 'register';

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-4">
        <img
          src={logoEmblem}
          alt="CampusCore"
          className="w-8 h-8 object-contain drop-shadow-sm"
        />
        <span className="font-sans font-bold text-lg tracking-tight text-foreground">
          CampusCore
        </span>
        <span className="text-muted font-sans text-xs font-normal">/ 2026</span>
      </div>
      
      <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight leading-tight mb-2">
        {isRegister ? (
          <>Join <span className="italic text-primary">organization.</span></>
        ) : (
          <>Welcome <span className="italic text-primary">back.</span></>
        )}
      </h1>
      
      <p className="font-sans text-xs sm:text-sm text-muted max-w-sm leading-relaxed">
        {isRegister 
          ? "Create your student account to activate membership."
          : "Sign in to continue managing your organization."}
      </p>
    </div>
  );
}
