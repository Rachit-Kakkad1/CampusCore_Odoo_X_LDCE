import React from 'react';

export default function EmailField({ value, onChange }) {
  return (
    <div className="mb-3">
      <label className="block font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted mb-2">
        EMAIL ADDRESS
      </label>
      <input
        type="email"
        autoComplete="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full bg-transparent border-b border-border py-2 text-base text-foreground font-sans outline-none focus:border-primary transition-colors placeholder:text-border"
        placeholder="student@example.com"
      />
    </div>
  );
}
