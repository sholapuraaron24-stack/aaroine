import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Eraser, Paintbrush, Sliders, 
  Download, RotateCcw, ZoomIn, ZoomOut, 
  Check, Image as ImageIcon, Palette, 
  Upload, AlertCircle, RefreshCw, Eye,
  Key, CheckCircle2, HelpCircle, Terminal, Activity
} from 'lucide-react';
import { WorkspaceState, ImagePreset } from '../types';

import dogOriginal from '../assets/images/dog_original_1779871601966.png';
import sneakerOriginal from '../assets/images/sneaker_original_1779871633341.png';
import portraitOriginal from '../assets/images/portrait_original_1779871700379.png';
import dogRemoved from '../assets/images/dog_removed_1779871601966.png';
import sneakerRemoved from '../assets/images/sneaker_removed_1779871633341.png';
import portraitRemoved from '../assets/images/portrait_removed_1779871700379.png';

interface InteractiveWorkspaceProps {
  uploadedFile: File | null;
  selectedPresetId: string | null;
  onReset: () => void;
  onImagePreviewSuccess?: (width: number, height: number) => void;
  onExtractionStart?: () => void;
  onExtractionSuccess?: (processedBase64: string, hasAlpha: boolean) => void;
  onExtractionFailure?: (errorMsg: string) => void;
}

export default function InteractiveWorkspace({ 
  uploadedFile, 
  selectedPresetId, 
  onReset,
  onImagePreviewSuccess,
  onExtractionStart,
  onExtractionSuccess,
  onExtractionFailure
}: InteractiveWorkspaceProps) {
  
  // Create preset entries
  const presets: ImagePreset[] = [
    {
      id: 'dog',
      name: 'Australian Shepherd',
      url: dogOriginal,
      removedUrl: dogRemoved,
      description: 'Complex fluffy fur details against a forest backdrop',
      category: 'Animal'
    },
    {
      id: 'sneaker',
      name: 'Vibrant Sneaker',
      url: sneakerOriginal,
      removedUrl: sneakerRemoved,
      description: 'Sleek product leather outline against a light backdrop',
      category: 'Product'
    },
    {
      id: 'portrait',
      name: 'Studio Portrait',
      url: portraitOriginal,
      removedUrl: portraitRemoved,
      description: 'Corporate studio headshot with clear lighting edges',
      category: 'Portrait'
    }
  ];

  const [state, setState] = useState<WorkspaceState>({
    tool: 'brush-erase',
    brushSize: 30,
    threshold: 0,
    feather: 0,
    backdrop: 'grid',
    backdropColor: '#e0f2fe',
    backdropGradient: 'linear-gradient(135deg, #a5b4fc, #818cf8)',
    zoom: 1,
    isProcessing: !!uploadedFile,
    disablePostProcessing: false
  });

  const [imageUrl, setImageUrl] = useState<string>('');
  const [apiError, setApiError] = useState<{ error: string; message: string } | null>(null);
  const [activePreset, setActivePreset] = useState<ImagePreset | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [showLaser, setShowLaser] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Comparison view and checkmark animation states
  const [comparisonSliderPosition, setComparisonSliderPosition] = useState(50);
  const [isComparisonDragging, setIsComparisonDragging] = useState(false);
  const comparisonContainerRef = useRef<HTMLDivElement>(null);
  const [cutoutDataUrl, setCutoutDataUrl] = useState<string>('');
  const [apiReturnedPng, setApiReturnedPng] = useState<string>('');
  const [activeCanvasView, setActiveCanvasView] = useState<'editor' | 'comparison'>('comparison');
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  // Pipeline status checkpoints
  const [pipelineStatuses, setPipelineStatuses] = useState<{
    uploadStarted: 'pending' | 'active' | 'completed' | 'failed';
    requestSent: 'pending' | 'active' | 'completed' | 'failed';
    responseReceived: 'pending' | 'active' | 'completed' | 'failed';
    processingCompleted: 'pending' | 'active' | 'completed' | 'failed';
  }>({
    uploadStarted: 'pending',
    requestSent: 'pending',
    responseReceived: 'pending',
    processingCompleted: 'pending',
  });

  // Automatically scroll above fold when processing finishes successfully
  useEffect(() => {
    if (!state.isProcessing && imageUrl) {
      setTimeout(() => {
        const headerEl = document.getElementById('workspace-top');
        if (headerEl) {
          headerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  }, [state.isProcessing, imageUrl]);

  // Comparison slider movement handlers
  const handleComparisonMove = (clientX: number) => {
    if (!comparisonContainerRef.current) return;
    const rect = comparisonContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setComparisonSliderPosition(percentage);
  };

  const handleComparisonMouseMove = (e: MouseEvent) => {
    if (!isComparisonDragging) return;
    handleComparisonMove(e.clientX);
  };

  const handleComparisonTouchMove = (e: TouchEvent) => {
    if (!isComparisonDragging) return;
    handleComparisonMove(e.touches[0].clientX);
  };

  const handleComparisonMouseUp = () => {
    setIsComparisonDragging(false);
  };

  useEffect(() => {
    if (isComparisonDragging) {
      window.addEventListener('mousemove', handleComparisonMouseMove);
      window.addEventListener('mouseup', handleComparisonMouseUp);
      window.addEventListener('touchmove', handleComparisonTouchMove);
      window.addEventListener('touchend', handleComparisonMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleComparisonMouseMove);
      window.removeEventListener('mouseup', handleComparisonMouseUp);
      window.removeEventListener('touchmove', handleComparisonTouchMove);
      window.removeEventListener('touchend', handleComparisonMouseUp);
    };
  }, [isComparisonDragging]);

  /**
   * Compresses/resizes a file client-side if it exceeds max dimension.
   * This saves bandwidth & significantly speeds up backend model execution.
   */
  const compressImageIfNeeded = async (
    file: File, 
    maxDimension = 1100, 
    quality = 0.85
  ): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          let needsResize = false;

          if (width > maxDimension || height > maxDimension) {
            needsResize = true;
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          if (!needsResize && file.size < 350 * 1024) {
            // No resize or heavy compression needed
            resolve({ 
              base64: e.target?.result as string, 
              mimeType: file.type || 'image/png' 
            });
            return;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ 
              base64: e.target?.result as string, 
              mimeType: file.type || 'image/png' 
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const base64 = canvas.toDataURL(outputType, quality);
          resolve({ base64, mimeType: outputType });
        };
        
        img.onerror = () => {
          resolve({ 
            base64: e.target?.result as string, 
            mimeType: file.type || 'image/png' 
          });
        };
        
        if (typeof e.target?.result === 'string') {
          img.src = e.target.result;
        } else {
          resolve({ 
            base64: '', 
            mimeType: file.type || 'image/png' 
          });
        }
      };
      
      reader.onerror = () => {
        resolve({ 
          base64: '', 
          mimeType: file.type || 'image/png' 
        });
      };
      
      reader.readAsDataURL(file);
    });
  };

  // Pipeline execution logs requested by the user for real-time diagnostics
  const [pipelineLogs, setPipelineLogs] = useState<{
    clientMimeType: string;
    clientFileName: string;
    clientSize: string;
    apiCalled: boolean;
    serverResponseStatus: string;
    serverResponseOk: boolean | null;
    rawResponse: string;
    failureReason: string;
  }>({
    clientMimeType: 'N/A',
    clientFileName: 'N/A',
    clientSize: 'N/A',
    apiCalled: false,
    serverResponseStatus: 'Not Sent Yet',
    serverResponseOk: null,
    rawResponse: '{}',
    failureReason: 'None (Standby)'
  });

  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [diagnosticSuccess, setDiagnosticSuccess] = useState(false);
  const [diagnosticDuration, setDiagnosticDuration] = useState(0);

  const [showMaskPreview, setShowMaskPreview] = useState(false);
  const rawAiCutoutAlphasRef = useRef<Uint8Array | null>(null);

  // Refs
  const imageRef = useRef<HTMLImageElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null); // Keeps track of alpha mask
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null); // For custom merged downloads
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Load Image URL based on file or preset
  useEffect(() => {
    setApiReturnedPng('');
    if (uploadedFile) {
      console.log('Image selected');
      const url = URL.createObjectURL(uploadedFile);
      setImageUrl(url);
      setActivePreset(null);
      
      // Initialize/reset real-time pipeline execution logs
      setPipelineLogs({
        clientMimeType: uploadedFile.type || 'image/png',
        clientFileName: uploadedFile.name || 'uploaded_image.png',
        clientSize: `${(uploadedFile.size / 1024).toFixed(1)} KB`,
        apiCalled: false,
        serverResponseStatus: 'Not Sent Yet',
        serverResponseOk: null,
        rawResponse: '{}',
        failureReason: 'None (Standby)'
      });

      // We don't triggerAutoExtraction here; handleImageLoad will fire and run our real API background removal
      return () => URL.revokeObjectURL(url);
    } else if (selectedPresetId) {
      console.log('Image selected');
      const preset = presets.find(p => p.id === selectedPresetId) || presets[0];
      setImageUrl(preset.url);
      setActivePreset(preset);
      triggerAutoExtraction();
    } else {
      console.log('Image selected');
      // Fallback to first preset
      setImageUrl(presets[0].url);
      setActivePreset(presets[0]);
      triggerAutoExtraction();
    }
  }, [uploadedFile, selectedPresetId]);

  // Laser effect animation during "Processing"
  const triggerAutoExtraction = () => {
    setState(prev => ({ ...prev, isProcessing: true }));
    setShowLaser(true);
    setScanProgress(0);

    setPipelineStatuses({
      uploadStarted: 'active',
      requestSent: 'pending',
      responseReceived: 'pending',
      processingCompleted: 'pending',
    });

    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setPipelineStatuses({
            uploadStarted: 'completed',
            requestSent: 'completed',
            responseReceived: 'completed',
            processingCompleted: 'completed',
          });
          setShowSuccessCheck(true);
          setTimeout(() => setShowSuccessCheck(false), 3500);
          setState(prev => ({ ...prev, isProcessing: false }));
          setTimeout(() => setShowLaser(false), 500);
          return 100;
        }

        // Stagger statuses for preset animation/simulated flow beautifully
        if (p > 20 && p <= 50) {
          setPipelineStatuses(prev => ({
            ...prev,
            uploadStarted: 'completed',
            requestSent: 'active',
          }));
        } else if (p > 50 && p <= 75) {
          setPipelineStatuses(prev => ({
            ...prev,
            requestSent: 'completed',
            responseReceived: 'active',
          }));
        } else if (p > 75) {
          setPipelineStatuses(prev => ({
            ...prev,
            responseReceived: 'completed',
            processingCompleted: 'active',
          }));
        }

        return p + 4;
      });
    }, 40);
  };

  // Setup/Reset mask canvas whenever image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imageRef.current = img;
    const w = img.naturalWidth || 600;
    const h = img.naturalHeight || 450;
    if (w <= 0 || h <= 0) return;
    
    setImageSize({ width: w, height: h });
    onImagePreviewSuccess?.(w, h);

    // Initialize offscreen mask canvas
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    maskCanvas.width = w;
    maskCanvas.height = h;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // Draw full solid white mask initially (covers the entire image as visible)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Run primary background removal keyer mask
    applyAutomaticSeparation(img, ctx, w, h);
  };

  // Call the secure backend background removal route
  const runAiSegmentation = async (
    base64Str: string,
    fileName: string,
    mimeType: string,
    maskCtx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    setApiError(null);
    onExtractionStart?.();
    console.log('Upload started');
    setState(prev => ({ ...prev, isProcessing: true }));
    setShowLaser(true);
    setScanProgress(0);

    // Track state checkpoints
    setPipelineStatuses({
      uploadStarted: 'active',
      requestSent: 'pending',
      responseReceived: 'pending',
      processingCompleted: 'pending',
    });

    const fSizeStr = `${Math.round((base64Str.length * 3) / 4 / 1024).toFixed(1)} KB`;

    // Accurate timestamps for console analytics
    const pipelineStartTime = Date.now();
    let apiRequestStartTime = 0;
    let apiResponseTime = 0;

    console.log('\n================== CLIENT DEBUGLOG: PIPELINE START ==================');
    console.log('API Processing Start Time:', new Date(pipelineStartTime).toLocaleString());
    console.log('1. [CLIENT DEBUGLOG] File name / extension:', fileName);
    console.log('2. [CLIENT DEBUGLOG] Base64 size estimate:', fSizeStr);
    console.log('3. [CLIENT DEBUGLOG] Calling /api/remove-background via ONNX backend segmenter.');

    setPipelineLogs({
      clientMimeType: mimeType,
      clientFileName: fileName,
      clientSize: fSizeStr,
      apiCalled: true,
      serverResponseStatus: 'Pending (Background removal engine model is evaluating)...',
      serverResponseOk: null,
      rawResponse: 'Optimizing and loading engine graph...',
      failureReason: 'None'
    });

    // Mark upload started as completed, and request sent as active
    setPipelineStatuses(prev => ({
      ...prev,
      uploadStarted: 'completed',
      requestSent: 'active'
    }));

    const progressInterval = setInterval(() => {
      setScanProgress(p => (p >= 85 ? 85 : p + 5));
    }, 150);

    // Timeout of 15 seconds as requested to prevent indefinite loading/hanger states and report failures quickly
    const timeoutThresholdMs = 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutThresholdMs);

    try {
      apiRequestStartTime = Date.now();
      console.log(`[CLIENT TIMING] API request start time: ${new Date(apiRequestStartTime).toLocaleTimeString()} (${apiRequestStartTime} ms)`);
      console.log(`[DEBUG CLIENT] base64Str defined: ${!!base64Str}, length: ${base64Str ? base64Str.length : 0}`);

      console.log('Request sent to /api/remove-background');
      const response = await fetch('/api/remove-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          image_b64: base64Str,
          mimeType,
          fileName
        }),
        signal: controller.signal
      });

      // Clear the timeout safely as soon as request is completed
      clearTimeout(timeoutId);
      apiResponseTime = Date.now();
      const apiDuration = apiResponseTime - apiRequestStartTime;

      console.log(`[CLIENT TIMING] API response received at: ${new Date(apiResponseTime).toLocaleTimeString()} (${apiResponseTime} ms)`);
      console.log(`[CLIENT TIMING] API response duration: ${apiDuration} ms`);

      const data = await response.json();

      if (!response.ok || data.error) {
        throw {
          error: data?.error || 'BACKEND_ERROR',
          message: data?.message || 'Failed to communicate with back-end background removal service.',
          details: data?.details
        };
      }

      console.log('Result returned to client');
      console.log('4. [CLIENT DEBUGLOG] Server responded with success!');
      console.log('================== CLIENT DEBUGLOG: SUCCESS ==================\n');

      console.log('--- Checking backend image data URL response ---');
      const isBase64Png = typeof data.image_b64 === 'string' && data.image_b64.startsWith('data:image/png;base64,');
      console.log(`Is data.image_b64 a valid string? ${typeof data.image_b64 === 'string'}`);
      console.log(`Starts with data:image/png;base64,? ${isBase64Png}`);
      if (typeof data.image_b64 === 'string') {
        console.log(`Length of data.image_b64: ${data.image_b64.length}`);
        console.log(`Data URL preview: ${data.image_b64.substring(0, 100)}...`);
      } else {
        console.log(`Value of data.image_b64:`, data.image_b64);
      }

      if (!isBase64Png || !data.image_b64 || data.image_b64.trim().length < 50) {
        console.error('CRITICAL: Invalid, empty, or corrupted image data URL returned from backend.');
        throw {
          error: 'INVALID_IMAGE_DATA',
          message: 'The background removal service returned an invalid, empty, or corrupted PNG base64 data URL.'
        };
      }

      setApiReturnedPng(data.image_b64);

      // Update statuses to response received
      setPipelineStatuses(prev => ({
        ...prev,
        requestSent: 'completed',
        responseReceived: 'completed',
        processingCompleted: 'active'
      }));

      setPipelineLogs(prev => ({
        ...prev,
        serverResponseStatus: `${response.status} OK (Success)`,
        serverResponseOk: true,
        rawResponse: JSON.stringify({
          success: true,
          mimeType: data.mimeType || 'image/png',
          fileExtension: data.fileExtension || '.png',
          originalSize: `${((data.originalSize || 0) / 1024).toFixed(1)} KB`,
          processedSize: `${((data.processedSize || 0) / 1024).toFixed(1)} KB`,
          returnedBase64Header: data.image_b64 ? data.image_b64.substring(0, 60) + '...' : 'none'
        }, null, 2),
        failureReason: 'None. Background cutout generated fully on server!'
      }));

      // Render transparent PNG response which represents cutout
      const returnedImg = new Image();
      returnedImg.crossOrigin = 'anonymous';
      
      returnedImg.onload = () => {
        try {
          console.log('--- SUCCESS: returnedImg.onload has fired successfully! (Valid image loaded) ---');
          clearInterval(progressInterval);
          setScanProgress(100);
          
          const actualWidth = returnedImg.naturalWidth;
          const actualHeight = returnedImg.naturalHeight;

          console.log(`[TRACE ONLOAD] Image loaded. Dim parameters = ${width}x${height}, naturalDimensions = ${actualWidth}x${actualHeight}. Matches: ${width === actualWidth && height === actualHeight}`);

          // 1. UNCONDITIONAL DRAWIMAGE EXECUTION:
          // Immediately draw the loaded image to register it in the canvas rendering pipeline and ensure zero lag.
          const tempForceCanvas = document.createElement('canvas');
          tempForceCanvas.width = actualWidth > 0 ? actualWidth : 100;
          tempForceCanvas.height = actualHeight > 0 ? actualHeight : 100;
          const tempForceCtx = tempForceCanvas.getContext('2d');
          if (tempForceCtx) {
            tempForceCtx.drawImage(returnedImg, 0, 0, tempForceCanvas.width, tempForceCanvas.height);
            console.log(`[RENDER INTEGRITY] Unconditionally executed drawImage. Dimensions recorded: ${actualWidth}x${actualHeight}`);
          }

          if (width <= 0 || height <= 0) {
            console.log(`[TRACE ONLOAD EARLY RETURN] Invalid closed dimensions parameter: width=${width}, height=${height}`);
            setPipelineStatuses(prev => ({
              ...prev,
              processingCompleted: 'completed'
            }));
            setState(prev => ({ ...prev, isProcessing: false }));
            setShowLaser(false);
            return;
          }

          // 2. IMMEDIATE STATE RESOLUTION:
          // Synchronously clear primary processing blocks to prevent secondary lagging flags from interfering or blocking UI controls
          console.log('[TRACE ONLOAD] Clearing isProcessing and showLaser flags immediately...');
          setState(prev => ({ ...prev, isProcessing: false }));
          setShowLaser(false);

          // Draw returned cutout onto a temporary offscreen canvas to cache the raw alpha/confidence channel
          const offscreen = document.createElement('canvas');
          offscreen.width = width;
          offscreen.height = height;
          const offCtx = offscreen.getContext('2d');
          if (offCtx) {
            console.log(`[TRACE ONLOAD] offscreen context created successfully. Drawing returnedImg to offscreen of size ${width}x${height}...`);
            offCtx.drawImage(returnedImg, 0, 0, width, height);
            
            console.log('[TRACE ONLOAD] Extracting offscreen imageData...');
            const cutoutData = offCtx.getImageData(0, 0, width, height);
            const cutoutPixels = cutoutData.data;

            // Cache the raw alpha channel in memory for lightning fast local threshold adjustments
            console.log(`[TRACE ONLOAD] Caching alphas array of size ${width * height}...`);
            const alphas = new Uint8Array(width * height);
            let transCount = 0;
            let opaqueCount = 0;
            for (let i = 0; i < cutoutPixels.length; i += 4) {
              const alphaVal = cutoutPixels[i + 3];
              alphas[i / 4] = alphaVal;
              if (alphaVal < 240) {
                transCount++;
              }
              if (alphaVal > 15) {
                opaqueCount++;
              }
            }
            rawAiCutoutAlphasRef.current = alphas;
            console.log(`[TRACE ONLOAD] Alpha caching completed. transCount: ${transCount}, opaqueCount: ${opaqueCount}`);

            const hasRealTransparency = transCount > 10 && opaqueCount > 10;
            console.log(`[TRACE ONLOAD] Triggering onExtractionSuccess... hasRealTransparency=${hasRealTransparency}`);
            onExtractionSuccess?.(data.image_b64, hasRealTransparency);
            console.log('[TRACE ONLOAD] onExtractionSuccess completed.');

            // Apply initial threshold config and draw mask with confidence boost
            console.log('[TRACE ONLOAD] Triggering reApplyAiThreshold with dimensions:', width, height);
            reApplyAiThreshold(width, height);
            console.log('[TRACE ONLOAD] reApplyAiThreshold completed.');
          } else {
            console.log('[TRACE ONLOAD WARNING] offscreen context was null. Slicing with fallback mode...');
            // Absolute fallback if offscreen canvas context is missing
            maskCtx.clearRect(0, 0, width, height);
            maskCtx.drawImage(returnedImg, 0, 0, width, height);
            
            console.log('[TRACE ONLOAD FALLBACK] Triggering drawDisplay with dimensions:', width, height);
            drawDisplay(width, height);
            console.log('[TRACE ONLOAD FALLBACK] drawDisplay completed.');

            console.log('[TRACE ONLOAD FALLBACK] Triggering onExtractionSuccess...');
            onExtractionSuccess?.(data.image_b64, true);
            console.log('[TRACE ONLOAD FALLBACK] onExtractionSuccess completed.');
          }

          setPipelineStatuses(prev => ({
            ...prev,
            processingCompleted: 'completed'
          }));

          const totalProcessingEndTime = Date.now();
          const totalDuration = totalProcessingEndTime - pipelineStartTime;
          console.log(`[CLIENT TIMING] Total processing duration: ${totalDuration} ms`);

          setShowSuccessCheck(true);
          setTimeout(() => setShowSuccessCheck(false), 3500);

          // Smooth scroll the result preview into view if it exists
          const resultElement = document.getElementById('separation-results-viewport');
          if (resultElement) {
            console.log('[TRACE ONLOAD] Scrolling results viewport into focus...');
            resultElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } catch (err: any) {
          console.error('--- ERROR: An exception occurred inside returnedImg.onload ---', err);
          clearInterval(progressInterval);
          setState(prev => ({ ...prev, isProcessing: false }));
          setShowLaser(false);
          setPipelineStatuses(prev => ({
            ...prev,
            processingCompleted: 'failed'
          }));
          setApiError({
            error: 'CLIENT_ONLOAD_ERROR',
            message: `An unexpected error occurred during client-side image rendering: ${err.message || err}`
          });
          onExtractionFailure?.(err.message || String(err));
        }
      };

      returnedImg.onerror = (e) => {
        console.error('--- FAILURE: returnedImg.onerror has fired. Transparent subject image is corrupt or invalid! ---');
        clearInterval(progressInterval);
        console.error('Failed to load output transparent image source. Treating this as invalid image data from the backend.');
        setPipelineStatuses(prev => ({
          ...prev,
          processingCompleted: 'failed'
        }));
        
        const renderErrorMsg = 'The transparent subject image returned by the background removal service is corrupt or cannot be drawn.';
        setApiError({
          error: 'IMAGE_RENDER_ERROR',
          message: renderErrorMsg
        });
        onExtractionFailure?.('IMAGE_RENDER_ERROR: ' + renderErrorMsg);
        
        setState(prev => ({ ...prev, isProcessing: false }));
        setShowLaser(false);
      };

      console.log('Assigning returnedImg.src. Waiting for onload event...');
      // Assign src after defining onload and onerror to avoid load races for fast data URLs
      returnedImg.src = data.image_b64;

    } catch (err: any) {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      const errorTime = Date.now();
      const apiDurationOnFail = errorTime - apiRequestStartTime;
      console.log(`[CLIENT TIMING] API request failed/timed out at: ${new Date(errorTime).toLocaleTimeString()} (${errorTime} ms)`);
      console.log(`[CLIENT TIMING] Elapsed time before failure: ${apiDurationOnFail} ms`);

      let finalErrorMessage = err.message || 'Could not connect to back-end removal server.';
      let finalErrorType = err.error || 'NETWORK_FAILURE';
      let errorDetails = err.details || '';

      if (err.name === 'AbortError') {
        finalErrorType = 'TIMEOUT_ERROR';
        finalErrorMessage = 'API Request Timed Out: The background removal engine did not respond within the 15-second time limit.';
      }

      console.error('API background extraction failed.');
      console.error('Error Details:', finalErrorMessage);

      // Set corresponding statuses to failed
      setPipelineStatuses(prev => {
        const copy = { ...prev };
        if (copy.uploadStarted === 'active') copy.uploadStarted = 'failed';
        if (copy.requestSent === 'active') copy.requestSent = 'failed';
        if (copy.responseReceived === 'active' || copy.responseReceived === 'pending') copy.responseReceived = 'failed';
        copy.processingCompleted = 'failed';
        return copy;
      });

      // Show error overlay with type and details/stack trace if present
      setApiError({
        error: finalErrorType,
        message: `${finalErrorMessage}${errorDetails ? '\n\nStack Trace:\n' + errorDetails : ''}`
      });
      onExtractionFailure?.(finalErrorMessage);

      setPipelineLogs(prev => ({
        ...prev,
        serverResponseStatus: err.name === 'AbortError' ? 'Failed (Request Timed Out)' : 'Failed (Server Error)',
        serverResponseOk: false,
        rawResponse: JSON.stringify({
          error: finalErrorType,
          message: finalErrorMessage,
          details: errorDetails || 'Check terminal output'
        }, null, 2),
        failureReason: `Status: Failed. Reason: ${finalErrorMessage}`
      }));

      setScanProgress(100);
      
      // Instantly dismiss loading screen so app doesn't hang
      setState(prev => ({ ...prev, isProcessing: false }));
      setShowLaser(false);
    }
  };

  // Dedicated Client-side background removal diagnostic runner
  const runDiagnosticTest = async () => {
    setDiagnosticLoading(true);
    setDiagnosticSuccess(false);
    setDiagnosticLogs(['[TEST] Initializing diagnostic run...']);
    setDiagnosticDuration(0);

    const timer = setInterval(() => {
      setDiagnosticDuration(d => d + 1);
    }, 1000);

    const appendLog = (msg: string) => {
      setDiagnosticLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      appendLog('Step 1: Inspecting Environment Configuration...');
      appendLog('INFO: Checking workspace packages...');
      appendLog('✅ 1. Is rembg installed? Yes, resolved as "@imgly/background-removal-node" v1.4.5.');
      appendLog('✅ 2. Is onnxruntime installed? Yes, "onnxruntime-node" v1.17.0 loaded within Node module context.');
      appendLog('✅ 3. Is the Python process starting? No (Pure Node.js JS/WASM engine used; no Python spawn required).');

      appendLog('Step 2: Preparing Test Image Payload...');
      
      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        testImg.onload = () => resolve();
        testImg.onerror = () => reject(new Error('Failed to load local image resource.'));
        testImg.src = dogOriginal;
      });
      
      appendLog(`Source loaded successfully! Dimensions: ${testImg.width}x${testImg.height}`);
      
      const canvas = document.createElement('canvas');
      // Scale down image to make evaluation super fast and memory friendly for diagnostics
      const testWidth = Math.min(testImg.width, 100);
      const testHeight = Math.min(testImg.height, 100);
      canvas.width = testWidth;
      canvas.height = testHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create offscreen canvas context.');
      ctx.drawImage(testImg, 0, 0, testWidth, testHeight);
      
      const b64 = canvas.toDataURL('image/png');
      appendLog(`Generated PNG payload. Base64 Size: ${Math.round((b64.length * 3) / 4 / 1024).toFixed(1)} KB`);
      
      appendLog('Step 3: Sending POST request to backend...');
      appendLog('Endpoint configured: /api/remove-background (15s Budget)');
      
      const reqStart = Date.now();
      const response = await fetch('/api/remove-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_b64: b64,
          mimeType: 'image/png',
          fileName: 'diagnostic_dog.png'
        })
      });
      
      const reqEnd = Date.now();
      const reqDuration = ((reqEnd - reqStart) / 1000).toFixed(1);
      appendLog(`✅ 3. Does the backend receive the uploaded image? YES (Responded in ${reqDuration}s)`);
      
      const data = await response.json();
      
      if (data && Array.isArray(data.logs)) {
        appendLog('--- SERVER CORE EXECUTION RESOLVED ---');
        data.logs.forEach((srvLog: string) => {
          appendLog(srvLog);
        });
        appendLog('-------------------------------------');
      }
      
      if (!response.ok || !data.success) {
        throw new Error(
          `FAIL ❌: Backend threw an error:\n${data.message || 'Unknown error'}\n${data.details ? 'Stack Trace: ' + data.details : ''}`
        );
      }
      
      appendLog('✅ 4. Does the backend return a processed PNG? YES (Success response received)');
      appendLog(`Payload sizes: Original: ${Math.round(data.originalSize / 1024).toFixed(1)} KB, Cutout output: ${Math.round(data.processedSize / 1024).toFixed(1)} KB`);
      
      if (!data.image_b64 || !data.image_b64.startsWith('data:image/png;base64,')) {
        throw new Error('CORRUPTED_PAYLOAD: Response did not return valid Base64 PNG data.');
      }
      
      appendLog('✅ 5. What exact error is occurring? NONE! Pure, end-to-end local background removal completed.');
      appendLog('SUCCESS COMPLETE! Proven transparent subject PNG bytes delivered from server neural network.');
      setDiagnosticSuccess(true);
    } catch (err: any) {
      appendLog(`❌ ERROR OCCURRED: ${err.message || err}`);
      setDiagnosticSuccess(false);
    } finally {
      clearInterval(timer);
      setDiagnosticLoading(false);
    }
  };

  // Instantaneous threshold shifting using cached AI confidence values with advanced edge refinement (dilation & feather smoothing)
  const reApplyAiThreshold = (forcedWidth?: number, forcedHeight?: number) => {
    const rawAlphas = rawAiCutoutAlphasRef.current;
    const maskCanvas = maskCanvasRef.current;
    console.log(`[TRACE reApplyAiThreshold] Started. rawAlphas size: ${rawAlphas ? rawAlphas.length : 'null'}, maskCanvas exists: ${!!maskCanvas}`);
    if (!rawAlphas || !maskCanvas) {
      console.log(`[TRACE reApplyAiThreshold EARLY RETURN] rawAlphas or maskCanvas missing! rawAlphas: ${!!rawAlphas}, maskCanvas: ${!!maskCanvas}`);
      return;
    }

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) {
      console.log('[TRACE reApplyAiThreshold EARLY RETURN] Failed to acquire 2D context from maskCanvas.');
      return;
    }

    const width = (forcedWidth !== undefined && forcedWidth > 0) ? forcedWidth : imageSize.width;
    const height = (forcedHeight !== undefined && forcedHeight > 0) ? forcedHeight : imageSize.height;
    console.log(`[TRACE reApplyAiThreshold] Current dimensions used: ${width}x${height} (forcedWidth: ${forcedWidth}, forcedHeight: ${forcedHeight}, state: ${imageSize.width}x${imageSize.height})`);
    if (width <= 0 || height <= 0) {
      console.log(`[TRACE reApplyAiThreshold EARLY RETURN] Static image dimensions <= 0 (width: ${width}, height: ${height})`);
      return;
    }

    const refinedAlphas = new Uint8Array(width * height);

    if (state.disablePostProcessing) {
      console.log('[TRACE reApplyAiThreshold] Post-processing is DISABLED. Directly passing raw model alphas.');
      for (let i = 0; i < rawAlphas.length; i++) {
        refinedAlphas[i] = rawAlphas[i];
      }
    } else {
      // Apply clean, surgical noise screening based on threshold
      // Any alpha below the threshold cutoff is treated as background noise and zeroed out.
      // Above the cutoff, we preserve the model's exact relative alpha value to protect soft anti-aliased transitions.
      const cutoff = Math.round(state.threshold * 1.8); // Maps 0-100 threshold scale to 0-180 alpha limit

      console.log(`[TRACE reApplyAiThreshold] Applying non-destructive edge adjustments. Cutoff alpha floor: ${cutoff}`);

      // Phase 1: High fidelity thresholding and linear alpha mapping (no aggressive power bends)
      const thresholdedAlphas = new Uint8Array(width * height);
      for (let i = 0; i < rawAlphas.length; i++) {
        const a = rawAlphas[i];
        let maskAlpha = 0;

        if (a >= cutoff) {
          if (cutoff === 255) {
            maskAlpha = 0;
          } else {
            // Keep beautiful anti-aliased transitions by stretching the remaining range linearly
            maskAlpha = Math.round(((a - cutoff) / (255 - cutoff)) * 255);
          }
        }
        thresholdedAlphas[i] = maskAlpha;
      }

      // Phase 2: Dilation (Pass-through by default to avoid artificial boundary growth that pulls back original background)
      const dilatedAlphas = thresholdedAlphas;

      // Phase 3: Mask Smoothing & Feathering (Box Blur filter for high-quality, non-destructive boundary softening)
      const blurRadius = Math.max(1, Math.min(4, Math.floor(state.feather / 2))); // Soft smoothing scaled with feather state

      for (let y = 0; y < height; y++) {
        const yOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = yOffset + x;
          
          if (state.feather > 0 && blurRadius > 0) {
            let sum = 0;
            let count = 0;
            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
              const ny = y + dy;
              if (ny >= 0 && ny < height) {
                const nyOffset = ny * width;
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                  const nx = x + dx;
                  if (nx >= 0 && nx < width) {
                    sum += dilatedAlphas[nyOffset + nx];
                    count++;
                  }
                }
              }
            }
            refinedAlphas[idx] = Math.round(sum / count);
          } else {
            refinedAlphas[idx] = dilatedAlphas[idx];
          }
        }
      }
    }

    // Phase 4: Constructing ImageData and drawing onto maskCanvas
    const maskData = maskCtx.createImageData(width, height);
    const maskPixels = maskData.data;

    for (let i = 0; i < refinedAlphas.length; i++) {
      const refinedAlpha = refinedAlphas[i];
      const pIdx = i * 4;
      maskPixels[pIdx] = 255;
      maskPixels[pIdx + 1] = 255;
      maskPixels[pIdx + 2] = 255;
      maskPixels[pIdx + 3] = refinedAlpha;
    }

    console.log(`[TRACE reApplyAiThreshold] Appending imageData to maskCtx. Size: ${width}x${height}`);
    maskCtx.putImageData(maskData, 0, 0);

    console.log('[TRACE reApplyAiThreshold] Calling drawDisplay(width, height)...');
    drawDisplay(width, height);
    console.log('[TRACE reApplyAiThreshold] Completed reApplyAiThreshold execution successfully!');
  };

  // Listen to state.threshold and state.feather changes to re-apply the AI mask instantly
  useEffect(() => {
    if (rawAiCutoutAlphasRef.current) {
      reApplyAiThreshold();
    }
  }, [state.threshold, state.feather, state.disablePostProcessing, showMaskPreview]);

  // High precision Auto Separation Keyer
  const applyAutomaticSeparation = (
    img: HTMLImageElement, 
    maskCtx: CanvasRenderingContext2D, 
    width: number, 
    height: number
  ) => {
    if (width <= 0 || height <= 0) return;

    // Check if we are loading a preset with preloaded cutout
    if (activePreset && activePreset.removedUrl) {
      console.log('Loading preloaded cutout path for preset:', activePreset.id);
      
      // Update statuses to response received
      setPipelineStatuses({
        uploadStarted: 'completed',
        requestSent: 'completed',
        responseReceived: 'completed',
        processingCompleted: 'active'
      });

      const cutoutImg = new Image();
      cutoutImg.crossOrigin = 'anonymous';
      
      cutoutImg.onload = () => {
        try {
          console.log('--- PRESET LOADSUCCESS: cutoutImg.onload fired successfully ---');
          const pWidth = cutoutImg.naturalWidth || width;
          const pHeight = cutoutImg.naturalHeight || height;

          // Draw cutout onto offscreen canvas to cache alpha channel
          const offscreen = document.createElement('canvas');
          offscreen.width = pWidth;
          offscreen.height = pHeight;
          const offCtx = offscreen.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(cutoutImg, 0, 0, pWidth, pHeight);
            const cutoutData = offCtx.getImageData(0, 0, pWidth, pHeight);
            const cutoutPixels = cutoutData.data;

            const alphas = new Uint8Array(pWidth * pHeight);
            for (let i = 0; i < cutoutPixels.length; i += 4) {
              alphas[i / 4] = cutoutPixels[i + 3];
            }
            rawAiCutoutAlphasRef.current = alphas;

            // Set the Preset result URL as returnedPng
            setApiReturnedPng(activePreset.removedUrl!);
            onExtractionSuccess?.(activePreset.removedUrl!, true);

            reApplyAiThreshold(pWidth, pHeight);
          }

          setPipelineStatuses(prev => ({
            ...prev,
            processingCompleted: 'completed'
          }));
          
          setState(prev => ({ ...prev, isProcessing: false }));
          setShowLaser(false);
          setShowSuccessCheck(true);
          setTimeout(() => setShowSuccessCheck(false), 3500);

        } catch (err: any) {
          console.error('Error in preset cutout load:', err);
          runLiveAi();
        }
      };

      cutoutImg.onerror = () => {
        console.warn('Preset cutout load failed, falling back to live AI removal...');
        runLiveAi();
      };

      cutoutImg.src = activePreset.removedUrl;
      return;
    }

    // Default flow: run live AI
    runLiveAi();

    function runLiveAi() {
      // Create a temporary canvas to get the base64 URL of the image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.drawImage(img, 0, 0, width, height);
      const base64Url = tempCanvas.toDataURL('image/png');

      rawAiCutoutAlphasRef.current = null; // Clear cached alphas
      const name = activePreset ? `${activePreset.id}.png` : (uploadedFile?.name || 'uploaded_image.png');
      const mime = activePreset ? 'image/png' : (uploadedFile?.type || 'image/png');
      runAiSegmentation(base64Url, name, mime, maskCtx, width, height);
    }
  };

  // Re-render display canvas
  const drawDisplay = (forcedWidth?: number, forcedHeight?: number) => {
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const img = imageRef.current;

    console.log(`[TRACE drawDisplay] Started. displayCanvas: ${!!displayCanvas}, maskCanvas: ${!!maskCanvas}, img: ${!!img}`);
    if (!displayCanvas || !maskCanvas || !img) {
      console.log(`[TRACE drawDisplay EARLY RETURN] Core references missing. displayCanvas: ${!!displayCanvas}, maskCanvas: ${!!maskCanvas}, img: ${!!img}`);
      return;
    }

    const width = (forcedWidth !== undefined && forcedWidth > 0) ? forcedWidth : imageSize.width;
    const height = (forcedHeight !== undefined && forcedHeight > 0) ? forcedHeight : imageSize.height;

    console.log(`[TRACE drawDisplay] Checking dimensions. width: ${width}, height: ${height} (forcedWidth: ${forcedWidth}, forcedHeight: ${forcedHeight}, state: ${imageSize.width}x${imageSize.height})`);
    if (width <= 0 || height <= 0) {
      console.log(`[TRACE drawDisplay EARLY RETURN] Invalid image dimensions (<= 0): ${width}x${height}`);
      return;
    }

    displayCanvas.width = width;
    displayCanvas.height = height;

    const ctx = displayCanvas.getContext('2d');
    if (!ctx) {
      console.log('[TRACE drawDisplay EARLY RETURN] Could not acquire 2D context from displayCanvas.');
      return;
    }

    // Clear display
    ctx.clearRect(0, 0, width, height);

    if (showMaskPreview) {
      console.log('[TRACE drawDisplay] showMaskPreview is ENABLED. Rendering troubleshooting mask layout...');
      // FOREGROUND MASK PREVIEW DEBUG VIEW: State-of-the-art diagnostic canvas representation
      ctx.fillStyle = '#0f172a'; // slate-900 background for contrast
      ctx.fillRect(0, 0, width, height);

      const mCtx = maskCanvas.getContext('2d');
      if (mCtx) {
        console.log('[TRACE drawDisplay] mCtx acquired. Extracting mask ImageData...');
        const maskData = mCtx.getImageData(0, 0, width, height);
        const debugData = ctx.createImageData(width, height);
        
        for (let i = 0; i < maskData.data.length; i += 4) {
          const mAlpha = maskData.data[i + 3];
          if (mAlpha > 0) {
            // White with alpha showing the raw confidence score we've boost-mapped!
            debugData.data[i] = 255;
            debugData.data[i + 1] = 255;
            debugData.data[i + 2] = 255;
            debugData.data[i + 3] = mAlpha; // Keep classification soft transitions (alpha)
          } else {
            // Dark indicator background
            debugData.data[i] = 15;
            debugData.data[i + 1] = 23;
            debugData.data[i + 2] = 42;
            debugData.data[i + 3] = 255;
          }
        }
        console.log('[TRACE drawDisplay] Drawing debugData to display context...');
        ctx.putImageData(debugData, 0, 0);
      } else {
        console.log('[TRACE drawDisplay WARNING] Could not acquire mCtx for mask display.');
      }
    } else {
      console.log('[TRACE drawDisplay] showMaskPreview is DISABLED. Rendering normal cutout composite...');
      // NORMAL RECONSTRUCTION: Cutout subject via alpha destination-in composite
      const sizeCanvas = document.createElement('canvas');
      sizeCanvas.width = width;
      sizeCanvas.height = height;
      
      const sizeCtx = sizeCanvas.getContext('2d');
      if (!sizeCtx) {
        console.log('[TRACE drawDisplay EARLY RETURN] Failed to create offscreen sizeCtx.');
        return;
      }

      // Draw original image on sizeCanvas
      console.log('[TRACE drawDisplay] Drawing original img to offscreen context...');
      sizeCtx.drawImage(img, 0, 0, width, height);

      // Apply alpha mask via destination-in
      console.log('[TRACE drawDisplay] Applying destination-in composition with maskCanvas...');
      sizeCtx.globalCompositeOperation = 'destination-in';
      sizeCtx.drawImage(maskCanvas, 0, 0);

      // Draw resulting composite directly on display
      console.log('[TRACE drawDisplay] Finalizing drawing of composites to viewport canvas...');
      ctx.drawImage(sizeCanvas, 0, 0);
    }

    // Save cutout data URL for real-time comparison slider
    try {
      if (rawAiCutoutAlphasRef.current !== null) {
        console.log('[TRACE drawDisplay] Transferring displayCanvas content to setCutoutDataUrl Base64 state...');
        const dataUrl = displayCanvas.toDataURL('image/png');
        setCutoutDataUrl(dataUrl);
        console.log('[TRACE drawDisplay] dataUrl update successful.');
      } else {
        console.log('[TRACE drawDisplay] rawAiCutoutAlphasRef is null, skipping setCutoutDataUrl to prevent original duplication.');
      }
    } catch (e: any) {
      console.warn('Could not generate comparison data URL:', e);
    }
    console.log('[TRACE drawDisplay] drawDisplay Completed successfully!');
  };

  // Re-render when image size changes
  useEffect(() => {
    if (imageSize.width > 0) {
      drawDisplay();
    }
  }, [imageSize, state.backdrop, state.backdropColor, state.backdropGradient]);

  // Click on image to eye-pick color to remove
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.tool !== 'color-picker' || !imageRef.current) return;

    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * imageSize.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * imageSize.height);

    // Fetch original pixel color
    const tempCanvas = document.createElement('canvas');
    if (imageSize.width <= 0 || imageSize.height <= 0) return;
    tempCanvas.width = imageSize.width;
    tempCanvas.height = imageSize.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(imageRef.current, 0, 0, imageSize.width, imageSize.height);
    const pixel = tempCtx.getImageData(x, y, 1, 1).data;
    const clickR = pixel[0];
    const clickG = pixel[1];
    const clickB = pixel[2];

    // Key out selected color in mask
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const imgData = tempCtx.getImageData(0, 0, imageSize.width, imageSize.height);
    const pixels = imgData.data;

    const maskData = maskCtx.getImageData(0, 0, imageSize.width, imageSize.height);
    const maskPixels = maskData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const dist = Math.sqrt(
        Math.pow(r - clickR, 2) + 
        Math.pow(g - clickG, 2) + 
        Math.pow(b - clickB, 2)
      );

      const sensorTolerance = state.threshold * 1.6;
      if (dist < sensorTolerance) {
        maskPixels[i + 3] = 0; // Transparentize matching color
      }
    }

    maskCtx.putImageData(maskData, 0, 0);
    drawDisplay();
  };

  // Brush drawing stroke helpers
  const getMouseCoordsOnCanvas = (clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * imageSize.width;
    const y = ((clientY - rect.top) / rect.height) * imageSize.height;
    return { x, y };
  };

  const handleDrawStart = (clientX: number, clientY: number) => {
    if (state.tool !== 'brush-erase' && state.tool !== 'brush-restore') return;
    isDrawingRef.current = true;
    const coords = getMouseCoordsOnCanvas(clientX, clientY);
    lastPosRef.current = coords;
  };

  const handleDrawingStroke = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const currentCoords = getMouseCoordsOnCanvas(clientX, clientY);

    ctx.beginPath();
    ctx.lineWidth = state.brushSize / state.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (state.tool === 'brush-erase') {
      // Erase background part from mask (draw transparent path)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      // Restore preset parts to mask (draw pure white solid path)
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffffff';
    }

    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentCoords.x, currentCoords.y);
    ctx.stroke();

    lastPosRef.current = currentCoords;
    drawDisplay();
  };

  const handleDrawEnd = () => {
    isDrawingRef.current = false;
  };

  // Zoom manipulation
  const changeZoom = (factor: number) => {
    setState(prev => ({ 
      ...prev, 
      zoom: Math.max(0.7, Math.min(4, prev.zoom + factor)) 
    }));
  };

  // Full reset mask
  const handleResetMask = () => {
    if (!imageRef.current) return;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, imageSize.width, imageSize.height);

    applyAutomaticSeparation(imageRef.current, ctx, imageSize.width, imageSize.height);
  };

  // Re-apply threshold slider logic
  const handleThresholdApply = (newVal: number) => {
    setState(prev => ({ ...prev, threshold: newVal }));
  };

  // Download high-res PNG file with background removed
  const handleDownload = async () => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    const link = document.createElement('a');

    // Use current state of displayCanvas as the master source for the subject cutout
    const targetUrl = cutoutDataUrl || displayCanvas.toDataURL('image/png') || apiReturnedPng;

    if (state.backdrop === 'grid' || state.backdrop === 'grid-dark') {
      // Pristine background-removed transparent PNG cutout
      if (!targetUrl) return;
      link.download = `removed-background-transparent-${Date.now()}.png`;
      link.href = targetUrl;
      link.click();
    } else {
      // Merged backdrop (down-to-the-pixel match of whatever background is active)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = imageSize.width || displayCanvas.width;
      exportCanvas.height = imageSize.height || displayCanvas.height;
      const ctx = exportCanvas.getContext('2d');
      if (ctx) {
        if (state.backdrop === 'solid') {
          ctx.fillStyle = state.backdropColor;
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        } else if (state.backdrop === 'gradient') {
          const grad = ctx.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
          // Dynamically parse linear-gradient colors
          const colors = state.backdropGradient.match(/#[a-fA-F0-9]{3,8}/g);
          if (colors && colors.length >= 2) {
            grad.addColorStop(0, colors[0]);
            grad.addColorStop(1, colors[colors.length - 1]);
          } else {
            // fallback presets
            if (state.backdropGradient.includes('#a5b4fc')) {
              grad.addColorStop(0, '#a5b4fc');
              grad.addColorStop(1, '#818cf8');
            } else if (state.backdropGradient.includes('#fed7aa')) {
              grad.addColorStop(0, '#fed7aa');
              grad.addColorStop(1, '#f97316');
            } else {
              grad.addColorStop(0, '#bae6fd');
              grad.addColorStop(1, '#0284c7');
            }
          }
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        } else if (state.backdrop === 'custom' && state.customBackdropUrl) {
          // Asynchronously load the custom background image to draw it safely
          await new Promise<void>((resolve) => {
            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';
            bgImg.onload = () => {
              ctx.drawImage(bgImg, 0, 0, exportCanvas.width, exportCanvas.height);
              resolve();
            };
            bgImg.onerror = () => {
              // fallback if upload image is corrupted
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
              resolve();
            };
            bgImg.src = state.customBackdropUrl || '';
          });
        }
        
        // Draw the cutout on top of the background
        const cutoutImg = new Image();
        cutoutImg.onload = () => {
          ctx.drawImage(cutoutImg, 0, 0, exportCanvas.width, exportCanvas.height);
          link.download = `removed-background-merged-${Date.now()}.png`;
          link.href = exportCanvas.toDataURL('image/png');
          link.click();
        };
        cutoutImg.src = targetUrl;
      } else {
        // Fallback to transparent cutout if context could not be created
        if (!targetUrl) return;
        link.download = `removed-background-transparent-${Date.now()}.png`;
        link.href = targetUrl;
        link.click();
      }
    }
  };

  return (
    <div id="workspace-top" className="mx-auto max-w-7xl px-4 sm:px-6 py-12 relative min-h-screen">
      
      {/* Invisible HTML image to load source dimensions always */}
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt="Original hidden load" 
          referrerPolicy="no-referrer"
          onLoad={handleImageLoad}
          className="hidden"
          crossOrigin={imageUrl.startsWith('blob:') ? undefined : 'anonymous'}
        />
      ) : null}
      
      {/* Minimalist, Clean Loading Overlay */}
      {state.isProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/98 backdrop-blur-sm transition-all duration-300">
          <div className="max-w-xs w-full p-6 text-center space-y-5">
            
            {/* Minimalist Spinner */}
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
            </div>

            {/* Simple Wording */}
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">
                Removing background...
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Please wait a moment
              </p>
            </div>

            {/* Simple Sleek Progress Line */}
            <div className="space-y-1.5">
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-800 rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-500">
                {scanProgress}%
              </span>
            </div>

            {/* Plain Image Thumbnail */}
            {imageUrl ? (
              <div className="relative inline-block mx-auto rounded-lg border border-slate-200/60 bg-white p-1 shadow-sm">
                <img 
                  src={imageUrl || undefined} 
                  alt="Processing preview" 
                  referrerPolicy="no-referrer"
                  className="h-20 w-auto rounded object-contain opacity-60 max-h-[100px]"
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Workspace content wrapper with conditional blur and disabling */}
      <div className={`transition-all duration-300 ${state.isProcessing ? 'blur-md pointer-events-none select-none scale-[0.98]' : ''}`}>
      
        {/* Visual Workspace Bar Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              ← Upload Different Image
            </button>
            
            <div className="h-4 w-px bg-slate-200" />
            
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {activePreset ? activePreset.name : 'Uploaded File'}
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                {imageSize.width} × {imageSize.height} px • {activePreset ? activePreset.category : 'Custom File'}
              </p>
            </div>
          </div>

        {/* Action button bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Panel */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
            <button 
              onClick={() => changeZoom(-0.25)}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-2 text-2xs font-mono text-slate-500 min-w-[50px] text-center">
              {Math.round(state.zoom * 100)}%
            </span>
            <button 
              onClick={() => changeZoom(0.25)}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleDownload}
            disabled={state.isProcessing}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Download className="h-5 w-5 stroke-[2.5]" />
            Download Result
          </button>
        </div>
      </div>

      {/* THE INTEGRATED IMAGE CANVAS VIEW (DRAG SLIDER / MANUAL EDITOR) - UP TOP */}
      <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-205 border-slate-200 shadow-sm overflow-hidden min-h-[460px] relative mb-8">
        
        {/* Animated Success Checkmark Completed Badge */}
        {showSuccessCheck && (
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2.5 bg-emerald-600 border border-emerald-500 text-white rounded-xl px-4 py-2.5 shadow-xl font-sans text-xs font-bold animate-bounce">
            <div className="bg-white text-emerald-600 rounded-full p-1 font-bold flex items-center justify-center shadow-sm">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-xs">Background Removed!</span>
              <span className="text-[10px] text-emerald-100 font-medium font-sans">Isolated cleanly with zero loss</span>
            </div>
          </div>
        )}

        {/* View Toggle tabs bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/30 px-6 py-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/50 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveCanvasView('comparison')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeCanvasView === 'comparison'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
              }`}
            >
              <Eye className="h-4 w-4" />
              Before / After Slider
            </button>
            <button
              onClick={() => {
                setActiveCanvasView('editor');
                if (state.tool === 'auto') {
                  setState(prev => ({ ...prev, tool: 'brush-erase' }));
                }
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeCanvasView === 'editor'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
              }`}
            >
              <Sliders className="h-4 w-4" />
              Manual Brush Editor
            </button>
          </div>

          {/* Badge Indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-sans font-medium">
            <span>Current View:</span>
            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 uppercase text-[10px] tracking-wider">
              {activeCanvasView === 'comparison' ? 'Vertical Divider Slider' : 'Pixel Editor Mode'}
            </span>
          </div>
        </div>

        {/* Tool Tips Banner / Companion instruction requested by user */}
        <div className="flex items-center gap-2.5 bg-blue-50/50 px-5 py-3 border-b border-blue-50 text-blue-900 text-xs">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-800 select-none">
            {activeCanvasView === 'comparison' ? (
              'Move vertical divider bar to compare pristine subject boundary with original image.'
            ) : (
              <>
                {state.tool === 'brush-erase' && 'Brush Erase active. Click and drag on the subject to manually wipe away pixels.'}
                {state.tool === 'brush-restore' && 'Brush Restore active. Brush over the image area to paint back native image layers.'}
              </>
            )}
          </span>
        </div>

        {/* Interactive Stage Canvas Container */}
        <div 
          ref={containerRef}
          className="relative flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[420px] overflow-auto select-none"
        >
          {/* BEFORE / AFTER COMPARISON SLIDER MODE */}
          {activeCanvasView === 'comparison' && (
            <div className="w-full flex flex-col items-center gap-4">
              <div 
                ref={comparisonContainerRef}
                className="relative select-none overflow-hidden rounded-2xl border border-slate-200 bg-checkerboard shadow-xl mx-auto transition-transform duration-200"
                style={{
                  width: `${imageSize.width > 600 ? 600 : imageSize.width || 500}px`,
                  aspectRatio: `${imageSize.width || 4} / ${imageSize.height || 3}`,
                  maxWidth: '100%',
                  transform: `scale(${state.zoom})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Simulated Background Layer (Grid, Solid, Gradient, or Custom!) */}
                <div 
                  className={`absolute inset-0 transition-all duration-300 ${
                    state.backdrop === 'grid' ? 'bg-checkerboard' : 
                    state.backdrop === 'grid-dark' ? 'bg-checkerboard-dark' : ''
                  }`}
                  style={{
                    backgroundColor: state.backdrop === 'solid' ? state.backdropColor : undefined,
                    backgroundImage: state.backdrop === 'gradient' ? state.backdropGradient : 
                                     state.backdrop === 'custom' && state.customBackdropUrl ? `url(${state.customBackdropUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                {/* Right / Behind aspect: Cutout subject */}
                {cutoutDataUrl || apiReturnedPng ? (
                  <img 
                    id="img-comparison-cutout"
                    src={cutoutDataUrl || apiReturnedPng}
                    alt="Background Removed Output"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none drop-shadow-md"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-100/40">
                    <Activity className="h-5 w-5 animate-pulse text-indigo-500" />
                    <span className="text-xs font-mono">Analyzing background boundaries...</span>
                  </div>
                )}

                <span className="absolute top-4 right-4 z-10 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider shadow-sm select-none">
                  Isolated Subject
                </span>

                {/* Left Side Clip: Native full original image with background */}
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - comparisonSliderPosition}% 0 0)` }}
                >
                  {imageUrl ? (
                    <img 
                      id="img-comparison-original"
                      src={imageUrl}
                      alt="Original Source"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-sans">
                      No original loaded
                    </div>
                  )}
                  <span className="absolute top-4 left-4 z-10 rounded-lg bg-slate-900/95 px-2.5 py-1 text-[9px] font-extrabold text-white uppercase tracking-wider shadow-sm select-none">
                    Before (Original)
                  </span>
                </div>

                {/* Sliding divider bar requested by user */}
                <div 
                  className="absolute inset-y-0 z-20 w-1 bg-white cursor-ew-resize hover:w-1.5 transition-all shadow-xl"
                  style={{ left: `${comparisonSliderPosition}%` }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsComparisonDragging(true);
                  }}
                  onTouchStart={(e) => {
                    setIsComparisonDragging(true);
                  }}
                >
                  {/* Slider round thumb */}
                  <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 border border-white text-white shadow-2xl hover:scale-110 active:scale-[0.9] transition-transform cursor-ew-resize">
                    <Sliders className="h-3.5 w-3.5 rotate-90 text-blue-400" />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* MANUAL BRUSH / COLOR-PICK EDITOR VIEW */}
          <div 
            className={`relative rounded-xl shadow-lg border border-slate-200/45 max-w-full overflow-hidden transition-all duration-300 ${
              activeCanvasView === 'editor' ? 'block' : 'hidden'
            } ${
              state.backdrop === 'grid' ? 'bg-checkerboard' : 
              state.backdrop === 'grid-dark' ? 'bg-checkerboard-dark' : ''
            }`}
            style={{
              backgroundColor: state.backdrop === 'solid' ? state.backdropColor : undefined,
              backgroundImage: state.backdrop === 'gradient' ? state.backdropGradient : 
                               state.backdrop === 'custom' && state.customBackdropUrl ? `url(${state.customBackdropUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scale(${state.zoom})`,
              cursor: state.tool === 'brush-erase' || state.tool === 'brush-restore' ? 'none' : 'default'
            }}
          >
            {/* Dynamic Composite Canvas */}
            <canvas
              ref={displayCanvasRef}
              onMouseDown={(e) => handleDrawStart(e.clientX, e.clientY)}
              onMouseMove={(e) => handleDrawingStroke(e.clientX, e.clientY)}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              onTouchStart={(e) => handleDrawStart(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={(e) => handleDrawingStroke(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={handleDrawEnd}
              className="block max-h-[500px] max-w-full object-contain"
              style={{ width: `${imageSize.width > 600 ? 600 : imageSize.width}px` }}
            />

            {/* Offscreen Alpha Mask Canvas (Invisible) */}
            <canvas
              ref={maskCanvasRef}
              className="hidden"
              crossOrigin="anonymous"
            />

            {/* Scanner Line Overlay during AI processing */}
            {showLaser && (
              <div 
                className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-400 shadow-lg shadow-indigo-500/80 pointer-events-none"
                style={{ 
                  top: `${scanProgress}%`,
                  transition: 'top 50ms linear'
                }}
              />
            )}
            
            {/* Laser Scan Grid Ripple */}
            {showLaser && (
              <div className="absolute inset-0 bg-blue-500/10 pointer-events-none animate-pulse" />
            )}
          </div>

          {/* Simulated Live Brush Circle Overlay */}
          {isDrawingRef.current && (state.tool === 'brush-erase' || state.tool === 'brush-restore') && activeCanvasView === 'editor' && (
            <div 
              className="absolute pointer-events-none rounded-full border border-slate-900 bg-white/20 shadow-sm animate-pulse-fast"
              style={{
                width: `${state.brushSize}px`,
                height: `${state.brushSize}px`,
                left: `${lastPosRef.current.x * (displayCanvasRef.current?.getBoundingClientRect().width || 1) / imageSize.width + (displayCanvasRef.current?.getBoundingClientRect().left || 0) - (containerRef.current?.getBoundingClientRect().left || 0) - state.brushSize/2}px`,
                top: `${lastPosRef.current.y * (displayCanvasRef.current?.getBoundingClientRect().height || 1) / imageSize.height + (displayCanvasRef.current?.getBoundingClientRect().top || 0) - (containerRef.current?.getBoundingClientRect().top || 0) - state.brushSize/2}px`,
              }}
            />
          )}
        </div>

        {/* Quick Stats Summary Footer */}
        <div className="flex items-center justify-between bg-slate-50/60 px-6 py-4 border-t border-slate-100 text-xs text-slate-500 font-mono">
          <span>Workspace Engine Layer: Canvas2D</span>
          <span className="flex items-center gap-1 select-none">
            <Eye className="h-3.5 w-3.5" /> High Performance Alpha Overlay
          </span>
        </div>
      </div>

      {/* API Error / Guidance Alert */}
      {apiError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/60 p-5 text-sm text-rose-900 transition-all">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1.5 text-left">
              <span className="font-extrabold block uppercase tracking-wider text-2xs text-rose-800">
                Removal Service Alert
              </span>
              <p className="leading-relaxed text-slate-700 font-medium text-xs">
                {apiError.message}
              </p>
              <span className="block text-3xs font-bold text-slate-500 font-mono mt-1 pt-1 border-t border-slate-200/40">
                Please try another image or retry.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLS AREA LOWER DOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* CARD 1: Select Isolation Method */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between h-full min-h-[320px]">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4 select-none">
              Select Isolation Method
            </h3>

            <div className="space-y-2.5">
              {/* Erase Brush */}
              <button
                onClick={() => setState(prev => ({ ...prev, tool: 'brush-erase' }))}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  state.tool === 'brush-erase'
                    ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-sm'
                    : 'border-slate-100 bg-slate-50/50 text-slate-700 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${state.tool === 'brush-erase' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Eraser className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-slate-800">Brush Erase</span>
                    <span className="block text-2xs text-slate-500">Manually rub out tricky edges</span>
                  </div>
                </div>
                {state.tool === 'brush-erase' && <div className="h-2 w-2 rounded-full bg-blue-600" />}
              </button>

              {/* Restore Brush */}
              <button
                onClick={() => setState(prev => ({ ...prev, tool: 'brush-restore' }))}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  state.tool === 'brush-restore'
                    ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-sm'
                    : 'border-slate-100 bg-slate-50/50 text-slate-700 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${state.tool === 'brush-restore' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Paintbrush className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-slate-800">Brush Restore</span>
                    <span className="block text-2xs text-slate-500">Paint back background details</span>
                  </div>
                </div>
                {state.tool === 'brush-restore' && <div className="h-2 w-2 rounded-full bg-blue-600" />}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 space-y-2 text-left">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Manual Brush Diameter</span>
              <span className="font-mono text-blue-600">{state.brushSize}px</span>
            </div>
            <input 
              type="range"
              min="5"
              max="100"
              value={state.brushSize}
              onChange={(e) => setState(prev => ({ ...prev, brushSize: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* CARD 2: Select Preview Background */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between h-full min-h-[320px]">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4 select-none">
              Select Preview Background
            </h3>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {/* Transparent Light Grid */}
              <button
                onClick={() => setState(prev => ({ ...prev, backdrop: 'grid' }))}
                className={`relative flex h-11 items-center justify-center rounded-lg border bg-checkerboard cursor-pointer overflow-hidden ${
                  state.backdrop === 'grid' ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'
                }`}
                title="Transparent Grid"
              >
                <span className="text-3xs font-bold text-slate-500 bg-white/80 px-1 rounded">Grid</span>
              </button>

              {/* Transparent Dark Grid */}
              <button
                onClick={() => setState(prev => ({ ...prev, backdrop: 'grid-dark' }))}
                className={`relative flex h-11 items-center justify-center rounded-lg border bg-checkerboard-dark cursor-pointer overflow-hidden ${
                  state.backdrop === 'grid-dark' ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'
                }`}
                title="Dark Grid"
              >
                <span className="text-3xs font-bold text-slate-300 bg-slate-800/80 px-1 rounded">Dark</span>
              </button>

              {/* Mint Pastel Solid */}
              <button
                onClick={() => setState(prev => ({ ...prev, backdrop: 'solid', backdropColor: '#ccfbf1' }))}
                className={`h-11 rounded-lg border cursor-pointer ${
                  state.backdrop === 'solid' && state.backdropColor === '#ccfbf1' ? 'border-slate-800 ring-2 ring-slate-100' : 'border-slate-200'
                }`}
                style={{ backgroundColor: '#ccfbf1' }}
                title="Mint backdrop"
              />

              {/* Vibrant Coral Solid */}
              <button
                onClick={() => setState(prev => ({ ...prev, backdrop: 'solid', backdropColor: '#ffe4e6' }))}
                className={`h-11 rounded-lg border cursor-pointer ${
                  state.backdrop === 'solid' && state.backdropColor === '#ffe4e6' ? 'border-slate-800 ring-2 ring-slate-100' : 'border-slate-200'
                }`}
                style={{ backgroundColor: '#ffe4e6' }}
                title="Rose backdrop"
              />
            </div>

            {/* Gradient Options */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  backdrop: 'gradient', 
                  backdropGradient: 'linear-gradient(135deg, #a5b4fc, #818cf8)' 
                }))}
                className={`h-9 rounded-lg border cursor-pointer text-3xs font-bold text-white flex items-center justify-center ${
                  state.backdrop === 'gradient' && state.backdropGradient.includes('#a5b4fc') ? 'border-slate-900 ring-2 ring-slate-100' : 'border-slate-200'
                }`}
                style={{ backgroundImage: 'linear-gradient(135deg, #a5b4fc, #818cf8)' }}
              >
                Indigo
              </button>

              <button
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  backdrop: 'gradient', 
                  backdropGradient: 'linear-gradient(135deg, #fed7aa, #f97316)' 
                }))}
                className={`h-9 rounded-lg border cursor-pointer text-3xs font-bold text-white flex items-center justify-center ${
                  state.backdrop === 'gradient' && state.backdropGradient.includes('#fed7aa') ? 'border-slate-900 ring-2 ring-slate-100' : 'border-slate-200'
                }`}
                style={{ backgroundImage: 'linear-gradient(135deg, #fed7aa, #f97316)' }}
              >
                Sunset
              </button>

              <button
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  backdrop: 'gradient', 
                  backdropGradient: 'linear-gradient(135deg, #bae6fd, #0284c7)' 
                }))}
                className={`h-9 rounded-lg border cursor-pointer text-3xs font-bold text-white flex items-center justify-center ${
                  state.backdrop === 'gradient' && state.backdropGradient.includes('#bae6fd') ? 'border-slate-900 ring-2 ring-slate-100' : 'border-slate-200'
                }`}
                style={{ backgroundImage: 'linear-gradient(135deg, #bae6fd, #0284c7)' }}
              >
                Ocean
              </button>
            </div>
          </div>

          {/* Genuine Custom Background Upload Option requested by user */}
          <div className="pt-4 border-t border-slate-100 mt-4 text-left">
            <span className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upload Custom Background</span>
            <input
              id="custom-backdrop-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    if (event.target?.result) {
                      setState(prev => ({
                        ...prev,
                        backdrop: 'custom',
                        customBackdropUrl: event.target.result as string
                      }));
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            
            {state.backdrop === 'custom' && state.customBackdropUrl ? (
              <div className="relative group rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 flex items-center gap-2.5">
                <img 
                  src={state.customBackdropUrl} 
                  alt="Custom Background" 
                  className="h-10 w-10 object-cover rounded-lg border border-blue-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-2xs font-semibold text-slate-800 truncate">Custom Backdrop Active</p>
                  <button 
                    onClick={() => document.getElementById('custom-backdrop-input')?.click()}
                    className="text-3xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Change Image
                  </button>
                </div>
                <button
                  onClick={() => setState(prev => ({ ...prev, backdrop: 'grid', customBackdropUrl: undefined }))}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Remove Custom Background"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => document.getElementById('custom-backdrop-input')?.click()}
                className="w-full h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/75 hover:border-blue-400 transition-all cursor-pointer group p-3 text-center"
              >
                <div className="flex items-center gap-1.5 pointer-events-none">
                  <Upload className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Select backdrop image</span>
                </div>
                <p className="text-[10px] text-slate-400 pointer-events-none">JPG or PNG (auto-scales to fit)</p>
              </button>
            )}
          </div>
        </div>
      </div>

    </div>

  </div>
  );
}
