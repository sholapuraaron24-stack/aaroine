import React from 'react';
import AaroineLogo from './AaroineLogo';

interface HeaderProps {
  onNavClick: (sectionId: string) => void;
  onOpenWorkshop?: () => void;
}

export default function Header({ onNavClick, onOpenWorkshop }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-blue-100/50 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
        {/* Brand Logotype */}
        <a 
          href="/" 
          className="flex items-center transition-opacity hover:opacity-90"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          {/* Stylized premium horizontal logo */}
          <AaroineLogo className="h-8 w-auto bg-transparent" />
        </a>

        {/* Navigation Links */}
        <nav className="flex items-center gap-8 text-sm font-medium">
          <button
            onClick={() => onNavClick('features')}
            className="text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => onNavClick('how-it-works')}
            className="text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
          >
            How it Works
          </button>
          
          {onOpenWorkshop && (
            <button
              onClick={onOpenWorkshop}
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all cursor-pointer"
            >
              Start Removing
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
