import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload as UploadIcon, Check, Sparkles, 
  ArrowRight, Heart, Star, FileImage, 
  ArrowUpRight, ClipboardCopy
} from 'lucide-react';

// Subcomponents
import Header from './components/Header';
import Footer from './components/Footer';
import StepsSection from './components/StepsSection';
import ValueProps from './components/ValueProps';
import FeedbackSection from './components/FeedbackSection';
import InteractiveWorkspace from './components/InteractiveWorkspace';
import ComparisonSlider from './components/ComparisonSlider';

// Demo Images Assets
import manOriginal from './assets/images/man_original_1780636734486.png';
import manRemoved from './assets/images/man_removed_1780636749414.png';
import cameraOriginal from './assets/images/camera_original_1780637546325.png';
import cameraRemoved from './assets/images/camera_removed_1780637564672.png';
import superheroOriginal from './assets/images/superhero_original_1780636792330.png';
import superheroRemoved from './assets/images/superhero_removed_1780636805783.png';

export default function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load local resource as File for live pipeline demo
  const handleTryDemoPreset = async (imageSrc: string, filename: string) => {
    try {
      setErrorMsg(null);
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/png' });
      setUploadedFile(file);
      setSelectedPresetId(null);
      setIsWorkspaceOpen(true);
    } catch (err) {
      console.error('Failed to load demo image:', err);
    }
  };

  // Scroll handler for landing navigation links
  const handleNavClick = (sectionId: string) => {
    // If in workspace, go back to landing first
    if (isWorkspaceOpen) {
      setIsWorkspaceOpen(false);
      setUploadedFile(null);
      setSelectedPresetId(null);
      setErrorMsg(null);
      // Wait for transition to complete
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Drag over handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        if (file.size > 2 * 1024 * 1024) {
          setErrorMsg('File size exceeds the 2MB limit. To prevent server out-of-memory errors on the Render web-service, please upload an image under 2MB.');
          return;
        }
        setErrorMsg(null);
        setUploadedFile(file);
        setSelectedPresetId(null);
        setIsWorkspaceOpen(true);
      }
    }
  };

  // Selector input file handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        if (file.size > 2 * 1024 * 1024) {
          setErrorMsg('File size exceeds the 2MB limit. To prevent server out-of-memory errors on the Render web-service, please upload an image under 2MB.');
          return;
        }
        setErrorMsg(null);
        setUploadedFile(file);
        setSelectedPresetId(null);
        setIsWorkspaceOpen(true);
      }
    }
  };



  // Scroll to extreme top whenever workspace is opened, ensuring above-the-fold display
  useEffect(() => {
    if (isWorkspaceOpen) {
      window.scrollTo(0, 0);
    }
  }, [isWorkspaceOpen]);

  // Watch for Clipboard pastes (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          if (file.size > 2 * 1024 * 1024) {
            setErrorMsg('File size exceeds the 2MB limit. To prevent server out-of-memory errors on the Render web-service, please upload an image under 2MB.');
            return;
          }
          setErrorMsg(null);
          setUploadedFile(file);
          setSelectedPresetId(null);
          setIsWorkspaceOpen(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-between">
      
      {/* Universal Header with responsive behavior */}
      <Header 
        onNavClick={handleNavClick} 
        onOpenWorkshop={() => {
          document.getElementById('file-upload-input')?.click();
        }}
      />

      <main className="flex-grow animate-fade-in">
        
        <AnimatePresence mode="wait">
          {!isWorkspaceOpen ? (
            /* =======================================================
               STATE 1: THE DELIGHTFUL HOMEPAGE & LANDING SECTION
               ======================================================= */
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-16 sm:py-20"
            >
              
              {/* Hero Header Presentation */}
              <div className="mx-auto max-w-4xl px-6 sm:px-8 text-center">
                <h2 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
                  Remove Backgrounds <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 bg-clip-text text-transparent">Instantly</span>
                </h2>
                
                <p className="mt-4 text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                  Upload any image and get a clean, transparent background in seconds — completely free. Professional results powered by advanced AI.
                </p>

                {/* Primary CTA Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                  <button
                    onClick={() => {
                      document.getElementById('file-upload-input')?.click();
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-4 text-sm font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none transition-all cursor-pointer"
                  >
                    Remove Background for Free
                  </button>
                  
                  <button
                    onClick={() => handleNavClick('how-it-works')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
                  >
                    See How It Works
                  </button>
                </div>

                {/* Bullets List beneath buttons */}
                <div className="mt-6 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-2xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" /> No credit card required
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" /> 100% Free
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" /> No sign-up needed
                  </span>
                </div>
              </div>

              {/* Huge Upload Area with Drag-and-Drop and Clipboard triggers */}
              <div className="mx-auto max-w-4xl px-6 sm:px-8 mt-12">
                {errorMsg && (
                  <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200/60 p-4 text-rose-800 text-sm font-semibold flex items-center gap-3 shadow-sm animate-fade-in mx-auto max-w-3xl justify-center">
                    <span className="text-base">⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 text-center transition-all min-h-[340px] select-none ${
                    isDragOver 
                      ? 'border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg shadow-blue-50' 
                      : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50'
                  }`}
                >
                  {/* File Select Native Trigger */}
                  <input
                    type="file"
                    id="file-upload-input"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  {/* Icon Block */}
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-6 shadow-sm transition-transform ${
                    isDragOver ? 'bg-blue-600 text-white scale-110' : 'bg-slate-50 text-slate-700'
                  }`}>
                    <UploadIcon className="h-7 w-7" />
                  </div>

                  {/* Header labels */}
                  <h3 className="text-xl font-bold text-slate-900">
                    Drag and drop an image
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    or paste image from clipboard <span className="font-mono bg-slate-100 rounded px-1.5 py-0.5 text-xs text-slate-600">Ctrl+V</span>
                  </p>

                  {/* Custom upload button */}
                  <button
                    type="button"
                    className="relative z-10 mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5.5 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all pointer-events-none"
                  >
                    <UploadIcon className="h-3.5 w-3.5" />
                    Upload Image
                  </button>

                  <p className="mt-6 text-2xs text-slate-400 tracking-wide font-mono uppercase">
                    Supported formats: JPG, PNG, WEBP. Max size: 2MB. (Render Memory Guard)
                  </p>
                </div>

                {/* Demo Presets selector for dynamic workflow experience */}
                <div className="mt-8 flex flex-col items-center">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3.5">
                    No image handy? Try one of these:
                  </span>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-2xl">
                    <button
                      onClick={() => handleTryDemoPreset(manOriginal, 'man_original.png')}
                      className="flex-1 group flex items-center gap-3 bg-white hover:bg-blue-50/20 border border-slate-200 hover:border-blue-300 rounded-2xl p-2.5 pr-4 shadow-xs transition-all text-left cursor-pointer animate-fade-in"
                    >
                      <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <img src={manOriginal} className="w-full h-full object-cover" alt="Example Portrait of a Man" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Portrait of a Man</p>
                        <p className="text-[10px] text-slate-500 font-medium">Fine hair & edge detail</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleTryDemoPreset(cameraOriginal, 'camera_original.png')}
                      className="flex-1 group flex items-center gap-3 bg-white hover:bg-blue-50/20 border border-slate-200 hover:border-blue-300 rounded-2xl p-2.5 pr-4 shadow-xs transition-all text-left cursor-pointer animate-fade-in"
                    >
                      <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <img src={cameraOriginal} className="w-full h-full object-cover" alt="Example Vintage Camera" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Vintage Camera</p>
                        <p className="text-[10px] text-slate-500 font-medium">Fine mechanical & lens detail</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleTryDemoPreset(superheroOriginal, 'superhero_original.png')}
                      className="flex-1 group flex items-center gap-3 bg-white hover:bg-blue-50/20 border border-slate-200 hover:border-blue-300 rounded-2xl p-2.5 pr-4 shadow-xs transition-all text-left cursor-pointer animate-fade-in"
                    >
                      <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <img src={superheroOriginal} className="w-full h-full object-cover" alt="Example Epic Superhero" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Epic Superhero</p>
                        <p className="text-[10px] text-slate-500 font-medium">Dynamic custom styling</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Before and After Interactive Comparison Slider */}
              <div className="mt-16 px-6 sm:px-8">
                <ComparisonSlider />
              </div>

              {/* Core cards section (Grid of value benefits) */}
              <ValueProps />

              {/* Visual Three steps section */}
              <StepsSection />

              {/* Feedback reviews collection system */}
              <FeedbackSection />

              {/* Immersive Bottom CTA banner */}
              <section className="py-16 px-6 sm:px-8 bg-white">
                <div className="mx-auto max-w-5xl">
                  <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 text-center text-white shadow-xl">
                    {/* Atmospheric background gradients */}
                    <div className="absolute -top-1/2 -left-1/4 h-[200%] w-[150%] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />
                    
                    <h3 className="relative z-10 text-3xl font-extrabold tracking-tight sm:text-4xl">
                      Start Removing Backgrounds Today — It's 100% Free
                    </h3>
                    <p className="relative z-10 mt-4 text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
                      Join thousands of creators, designers, and entrepreneurs using the web's most powerful AI eraser.
                    </p>

                    <div className="relative z-10 mt-8 flex justify-center">
                      <button
                        onClick={() => {
                          document.getElementById('file-upload-input')?.click();
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 shadow-md hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Upload Your First Image
                      </button>
                    </div>

                    <span className="relative z-10 block text-2xs text-slate-400 mt-4">
                      No credit card required. No hidden fees. Ever.
                    </span>
                  </div>
                </div>
              </section>

            </motion.div>
          ) : (
            /* =======================================================
               STATE 2: THE ADVANCED STUDIO EDITOR WORKSPACE
               ======================================================= */
            <motion.div
              key="workspace"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
            <InteractiveWorkspace 
              uploadedFile={uploadedFile} 
              selectedPresetId={selectedPresetId}
              onReset={() => {
                setIsWorkspaceOpen(false);
                setUploadedFile(null);
                setSelectedPresetId(null);
              }}
            />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Universal Footer */}
      <Footer />
    </div>
  );
}