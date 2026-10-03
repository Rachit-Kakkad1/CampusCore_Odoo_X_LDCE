import React from 'react';

export default function LoginHeader() {
  return (
    <div className="mb-6">
      <div className="font-serif text-sm md:text-base uppercase leading-tight tracking-tight mb-4">
        Student<br />Organization<br />System <span className="text-muted">/ 2026</span>
      </div>
      
      <div className="font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted mb-2">
        Member Access / 001
      </div>
      
      <h1 className="font-serif text-5xl lg:text-6xl uppercase leading-none mb-2">
        Welcome<br />
        <span className="italic text-primary">back.</span>
      </h1>
      
      <p className="font-sans text-sm md:text-base text-muted max-w-sm">
        Sign in to continue managing your organization.
      </p>
    </div>
  );
}
