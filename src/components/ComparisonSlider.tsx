import React, { useState, useRef, useEffect } from 'react';

// Use the imported generated image paths
import dogOriginal from '../assets/images/dog_original_1779871601966.png';
import dogRemoved from '../assets/images/dog_removed_1779871601966.png';

export default function ComparisonSlider() {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 to 100)
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <section className="py-20 px-6 sm:px-8 bg-blue-50/30">
      {/* SVG Clip Path definitions for high definition, non-destructive vector masks */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <clipPath id="dog-clip-precise" clipPathUnits="objectBoundingBox">
            <path d="M 0.6956 0.1563 L 0.7114 0.1667 L 0.7357 0.1771 L 0.7486 0.1875 L 0.7547 0.1979 L 0.7587 0.2083 L 0.7609 0.2188 L 0.7613 0.2292 L 0.7594 0.2396 L 0.7565 0.2500 L 0.7552 0.2604 L 0.7540 0.2708 L 0.7515 0.2813 L 0.7497 0.2917 L 0.7495 0.3021 L 0.7496 0.3125 L 0.7494 0.3229 L 0.7493 0.3333 L 0.7493 0.3438 L 0.7493 0.3542 L 0.7493 0.3646 L 0.7493 0.3750 L 0.7493 0.3854 L 0.7495 0.3958 L 0.7512 0.4063 L 0.7549 0.4167 L 0.7563 0.4271 L 0.7554 0.4375 L 0.7574 0.4479 L 0.7606 0.4583 L 0.7598 0.4688 L 0.7578 0.4792 L 0.7574 0.4896 L 0.7571 0.5000 L 0.7573 0.5104 L 0.7594 0.5208 L 0.7627 0.5313 L 0.7648 0.5417 L 0.7669 0.5521 L 0.7719 0.5625 L 0.7779 0.5729 L 0.7820 0.5833 L 0.7844 0.5938 L 0.7876 0.6042 L 0.7930 0.6146 L 0.7982 0.6250 L 0.8020 0.6354 L 0.8071 0.6458 L 0.8130 0.6563 L 0.8171 0.6667 L 0.8259 0.6771 L 0.8487 0.6875 L 0.8757 0.6979 L 0.8953 0.7083 L 0.9142 0.7188 L 0.9316 0.7292 L 0.9392 0.7396 L 0.9394 0.7500 L 0.9378 0.7604 L 0.9368 0.7708 L 0.9374 0.7813 L 0.9382 0.7917 L 0.9374 0.8021 L 0.9355 0.8125 L 0.9325 0.8229 L 0.9284 0.8333 L 0.9238 0.8438 L 0.9184 0.8542 L 0.9132 0.8646 L 0.9098 0.8750 L 0.9072 0.8854 L 0.9051 0.8958 L 0.9061 0.9063 L 0.9091 0.9167 L 0.9098 0.9271 L 0.9048 0.9375 L 0.8975 0.9479 L 0.8958 0.9583 L 0.8990 0.9688 L 0.9012 0.9792 L 0.9021 0.9896 L 0.9026 1.0000 L 0.4249 0.9987 L 0.4225 0.9883 L 0.4136 0.9779 L 0.4008 0.9674 L 0.3947 0.9570 L 0.3996 0.9466 L 0.4086 0.9362 L 0.4140 0.9258 L 0.4166 0.9154 L 0.4200 0.9049 L 0.4231 0.8945 L 0.4243 0.8841 L 0.4256 0.8737 L 0.4263 0.8633 L 0.4253 0.8529 L 0.4265 0.8424 L 0.4302 0.8320 L 0.4316 0.8216 L 0.4289 0.8112 L 0.4252 0.8008 L 0.4252 0.7904 L 0.4295 0.7799 L 0.4334 0.7695 L 0.4311 0.7591 L 0.4210 0.7487 L 0.4080 0.7383 L 0.3976 0.7279 L 0.3924 0.7174 L 0.3949 0.7070 L 0.4046 0.6966 L 0.4099 0.6862 L 0.4053 0.6758 L 0.4013 0.6654 L 0.4022 0.6549 L 0.4038 0.6445 L 0.4065 0.6341 L 0.4114 0.6237 L 0.4162 0.6133 L 0.4197 0.6029 L 0.4222 0.5924 L 0.4235 0.5820 L 0.4225 0.5716 L 0.4191 0.5612 L 0.4173 0.5508 L 0.4206 0.5404 L 0.4244 0.5299 L 0.4192 0.5195 L 0.3913 0.5091 L 0.3453 0.4987 L 0.3117 0.4883 L 0.3004 0.4779 L 0.2969 0.4674 L 0.2947 0.4570 L 0.2941 0.4466 L 0.2943 0.4362 L 0.2936 0.4258 L 0.2921 0.4154 L 0.2908 0.4049 L 0.2905 0.3945 L 0.2908 0.3841 L 0.2909 0.3737 L 0.2870 0.3633 L 0.2748 0.3529 L 0.2606 0.3424 L 0.2540 0.3320 L 0.2524 0.3216 L 0.2507 0.3112 L 0.2447 0.3008 L 0.2315 0.2904 L 0.2192 0.2799 L 0.2182 0.2695 L 0.2467 0.2591 L 0.3153 0.2487 L 0.3815 0.2383 L 0.4083 0.2279 L 0.4140 0.2174 L 0.4192 0.2070 L 0.4252 0.1966 L 0.4310 0.1862 L 0.4414 0.1758 L 0.4598 0.1654 L 0.4690 0.1563 Z" />
          </clipPath>
        </defs>
      </svg>

      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Precision You Can Trust
        </h2>
        <p className="mt-4 text-slate-600 text-sm max-w-xl mx-auto leading-relaxed">
          From complex hair details to professional product photography, our AI handles every edge with surgical precision.
        </p>

        {/* Dynamic Comparison Frame */}
        <div 
          ref={containerRef}
          className="relative mt-12 mx-auto aspect-[4/3] w-full max-w-2xl select-none overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-100 shadow-xl"
        >
          {/* Base Layer: Background Block (Checkerboard) */}
          <div className="absolute inset-0 bg-checkerboard" />

          {/* Right Side: Result (Dog with transparent BG) */}
          <img 
            src={dogRemoved}
            id="aaronics-result-img"
            alt="Aaroine Result"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover"
          />
          
          {/* Tag */}
          <span className="absolute top-4 right-4 z-10 rounded-lg bg-white/95 backdrop-blur-sm px-3 py-1.5 text-2xs font-bold text-blue-600 shadow-sm border border-blue-50">
            Aaroine Result (Clean Cut)
          </span>

          {/* Left Side: Original Image with background */}
          {/* Sibling 2 (Original Image): Same coordinates, same object-cover, wrapped in a div clipped horizontally. 
              This guarantees mathematically perfect pixel-to-pixel alignment across any resize ratio! */}
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img 
              src={dogOriginal}
              id="original-dog-img"
              alt="Original Dog"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Tag */}
            <span className="absolute top-4 left-4 z-10 rounded-lg bg-slate-900/95 px-3 py-1.5 text-2xs font-bold text-white shadow-sm flex flex-col items-start gap-0.5">
              <span>Original Image</span>
              <span className="text-[9px] text-slate-300 font-medium">100% Unaltered Subject</span>
            </span>
          </div>

          {/* Vertical Slider Handle and overlay click triggers */}
          <div 
            className="absolute inset-y-0 z-20 w-1 bg-white cursor-ew-resize hover:w-1.5 transition-all"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onTouchStart={(e) => {
              setIsDragging(true);
            }}
          >
            {/* Grab Button */}
            <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg border border-slate-200">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={2.5} 
                stroke="currentColor" 
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
              </svg>
            </div>
          </div>
        </div>

        {/* Professional Zero-Alteration Integrity Banner */}
        <div className="mt-8 mx-auto max-w-2xl bg-white rounded-2xl border border-slate-200/50 p-6 shadow-sm text-left">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 font-bold text-xs flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900">
              True Background Isolation Guarantee
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Unlike other products that recreate or redraw items with AI, our algorithm <strong className="text-slate-800">only isolates the background</strong>. Your subject is extracted byte-for-byte in its pristine original state. Colors, face identity, clothing elements, physical proportions, and technical fidelity remain <strong>completely unaltered with zero filters, enhancements, or generative changes</strong>.
          </p>
        </div>

      </div>
    </section>
  );
}
