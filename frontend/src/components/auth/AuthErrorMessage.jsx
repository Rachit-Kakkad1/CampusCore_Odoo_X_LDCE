import React from 'react';

export default function AuthErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div className="mb-6 pl-4 border-l-2 border-primary">
      <h4 className="font-mono text-[10px] uppercase tracking-widest mb-1 text-primary">Authentication Failed</h4>
      <p className="font-sans text-sm text-foreground">{message}</p>
    </div>
  );
}
