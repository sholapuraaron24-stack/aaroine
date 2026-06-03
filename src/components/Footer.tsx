import React from 'react';
import AaroineLogo from './AaroineLogo';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 px-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo */}
          <div className="flex items-center">
            <AaroineLogo className="h-7 w-auto bg-transparent" />
          </div>

          {/* Copyright description */}
          <p className="text-xs text-slate-500 text-center sm:text-right">
            &copy; 2026 Aaroine. Professional Background Removal at Scale.
          </p>
        </div>
      </div>
    </footer>
  );
}
