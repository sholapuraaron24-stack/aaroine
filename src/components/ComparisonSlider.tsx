import React, { useState, useRef, useEffect } from 'react';
import dogOriginal from '../assets/images/dog_original_1779871601966.png';
import dogRemoved from '../assets/images/dog_removed_1779871601966.png';

export default function ComparisonSlider() {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 - 100)
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Trace inputs to console as explicitly requested
  useEffect(() => {
    console.log('Original:', dogOriginal);
    console.log('Processed:', dogRemoved);
  }, []);

  // Measure and align the slider tracking width dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.getBoundingClientRect().width);

    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.getBoundingClientRect().width);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let position = (x / rect.width) * 100;
    if (position < 0) position = 0;
    if (position > 100) position = 100;
    setSliderPosition(position);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDraggingRef.current) return;
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Clean up global listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div id="comparison-slider-widget" className="w-full max-w-3xl mx-auto flex flex-col items-center">
      <div className="text-center mb-6">
        <h4 className="text-xl font-bold text-slate-800">
          Interactive Proof of Quality
        </h4>
        <p className="text-sm text-slate-500 mt-1">
          Drag the slider handle to see the precise cutout accuracy on complex fur textures
        </p>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-slate-200 select-none cursor-ew-resize bg-slate-50"
        onMouseMove={(e) => {
          if (isDraggingRef.current) handleMove(e.clientX);
        }}
        onTouchMove={(e) => {
          if (isDraggingRef.current && e.touches.length > 0) {
            handleMove(e.touches[0].clientX);
          }
        }}
      >
        {/* Layer 1: Background: Transparent Cutout version (placed on checkers) */}
        <div className="absolute inset-0 w-full h-full">
          {/* Dedicated checkerboard background layer */}
          <div 
            className="checkerboard absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #f1f5f9 25%, transparent 25%), 
                linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #f1f5f9 75%), 
                linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
              `,
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
              backgroundColor: '#ffffff',
              zIndex: 0
            }}
          />
          <img 
            src={dogRemoved} 
            alt="Dog Background-Removed Cutout"
            referrerPolicy="no-referrer"
            className="cutout-image w-full h-full object-cover relative"
            style={{ zIndex: 1 }}
            onLoad={() => console.log('Cutout loaded successfully:', dogRemoved)}
            onError={(e) => console.error('Cutout failed to load', e)}
          />
          <div className="absolute right-4 bottom-4 bg-slate-900/60 backdrop-blur-xs text-white text-3xs font-bold uppercase tracking-wider px-2 py-1 rounded z-10">
            Background Removed
          </div>
        </div>

        {/* Layer 2: Foreground Clip: Original Image */}
        <div 
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <div 
            className="absolute inset-y-0 left-0 h-full"
            style={{ width: containerWidth ? `${containerWidth}px` : '100%' }}
          >
            <img 
              src={dogOriginal} 
              alt="Dog Original Image"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="absolute left-4 bottom-4 bg-blue-600/75 backdrop-blur-xs text-white text-3xs font-bold uppercase tracking-wider px-2 py-1 rounded">
            Original
          </div>
        </div>

        {/* Layer 3: Vertical split slider bar & handle indicator */}
        <div 
          className="absolute inset-y-0 w-1 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] cursor-ew-resize flex items-center justify-center z-10"
          style={{ left: `${sliderPosition}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Circular handle */}
          <div className="absolute w-9 h-9 rounded-full bg-white shadow-md border-2 border-blue-600 flex items-center justify-center cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-4 h-4 text-blue-600"
            >
              <polyline points="15 8 19 12 15 16" />
              <polyline points="9 16 5 12 9 8" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
