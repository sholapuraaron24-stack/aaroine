import React from 'react';

interface AaroineLogoProps {
  className?: string;
}

export default function AaroineLogo({ className = '' }: AaroineLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span 
        id="aaroine-brand-logo"
        className="font-sans font-extrabold tracking-[-0.03em] text-2xl text-[#030F24] select-none inline-flex items-center leading-none"
      >
        Aaro
        <span className="relative inline-block leading-none">
          ı
          <span className="absolute left-[52%] -translate-x-1/2 top-[-0.06em] w-[0.21em] h-[0.21em] rounded-full bg-[#0072FF]" />
        </span>
        ne
      </span>
    </div>
  );
}
