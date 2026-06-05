import os from 'os';
// Monkey-patch os.homedir and cache paths to write into /tmp to prevent "EACCES: permission denied, mkdir '/.cache'" on Cloud Run
os.homedir = () => '/tmp';
process.env.HOME = '/tmp';
process.env.XDG_CACHE_HOME = '/tmp/.cache';

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import { removeBackground } from '@imgly/background-removal-node';
import { PNG } from 'pngjs';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const tempAssetsDir = '/tmp/imgly-assets';
let hasCopiedAssets = false;

// Helper to copy directory recursively
function copyDirSync(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      // Avoid copying map files or other unnecessary files to save space and time
      if (entry.name.endsWith('.map') || entry.name.endsWith('.d.ts') || entry.name.endsWith('.ts')) {
        continue;
      }
      if (!fs.existsSync(destPath)) {
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch (copyErr) {
          // Ignore copy errors for single lock files, but log generally
        }
      }
    }
  }
}

try {
  // Check common locations for the background removal model dist assets
  const pathsToTry = [
    path.join(process.cwd(), 'node_modules/@imgly/background-removal-node/dist'),
    path.join(__dirname, '../node_modules/@imgly/background-removal-node/dist'),
    path.join(__dirname, 'node_modules/@imgly/background-removal-node/dist'),
    path.join(__dirname, '../../node_modules/@imgly/background-removal-node/dist')
  ];
  
  let srcDir = '';
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      srcDir = p;
      break;
    }
  }

  if (srcDir) {
    console.log(`[STARTUP] Copying background removal model assets from ${srcDir} to ${tempAssetsDir}...`);
    copyDirSync(srcDir, tempAssetsDir);
    console.log(`[STARTUP] Local model assets successfully pre-cached in: ${tempAssetsDir}`);
    hasCopiedAssets = true;
  } else {
    console.warn(`[STARTUP] Warning: Could not locate @imgly/background-removal-node assets directory.`);
  }
} catch (err: any) {
  console.error('[STARTUP] Error creating model asset cache directory:', err.message || err);
}

async function startServer() {
  const app = express();

  // Parse JSON bodies with a generous limit to accommodate large base64 image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint for deployment container checks (e.g. Railway, Render, etc.)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date()
    });
  });

  // Helper function to log memory profile at checkpoints
  const logMemoryProfile = (checkpointLabel: string) => {
    const mem = process.memoryUsage();
    const toMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    console.log(`[MEMORY PROFILE - ${checkpointLabel}] RSS: ${toMB(mem.rss)} | HeapUsed: ${toMB(mem.heapUsed)} | External: ${toMB(mem.external)}`);
  };

  // API Route to handle professional background removal using the local open-source rembg model
  app.post('/api/remove-background', async (req, res) => {
    logMemoryProfile('START-POST-REQUEST');
    let base64Content: string | null = null;
    let buffer: Buffer | null = null;
    let imageBlob: Blob | null = null;
    let blob: any = null;
    let imageBuffer: ArrayBuffer | null = null;
    let outputBuffer: Buffer | null = null;

    try {
      console.log('Server received request to /api/remove-background');
      console.log('[SERVER DEBUGLOG] req.body has keys:', req.body ? Object.keys(req.body) : 'none');
      if (req.body && req.body.image_b64) {
        console.log('[SERVER DEBUGLOG] image_b64 length:', req.body.image_b64.length);
      } else {
        console.log('[SERVER DEBUGLOG] image_b64 is missing/falsy in body.');
      }
      
      const { image_b64, mimeType = 'image/png', fileName = 'upload.png' } = req.body || {};

      if (!image_b64) {
        console.error('[SERVER DEBUGLOG] ERROR: No base64 content received.');
        return res.status(400).json({
          error: 'MISSING_IMAGE',
          message: 'No image base64 data provided in request body.'
        });
      }

      // Convert base64 to binary buffer
      base64Content = image_b64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Content, 'base64');
      const originalLength = buffer.length;

      console.log(`Payload status: Received ${originalLength} bytes of image data, format indicated: ${mimeType}`);
      logMemoryProfile('PAYLOAD-PARSED-TO-BUFFER');

      // Server-side limit check to prevent massive memory allocations
      if (originalLength > 2 * 1024 * 1024) {
        console.error('[SERVER DEBUGLOG] ERROR: Payload size too large. LIMIT: 2MB.');
        return res.status(400).json({
          error: 'IMAGE_TOO_LARGE',
          message: `The uploaded image exceeds the 2MB RAM safety threshold (real size: ${(originalLength / 1024 / 1024).toFixed(2)}MB). Please downscale or use smaller files under 2MB.`
        });
      }

      const serverLogs: string[] = [];
      const logAndPush = (msg: string) => {
        const timeStr = new Date().toLocaleTimeString();
        const formatted = `[${timeStr}] ${msg}`;
        console.log(formatted);
        serverLogs.push(formatted);
      };

      // Set up progress tracking flags
      let downloadStarted = false;
      let downloadCompleted = false;
      let inferenceStarted = false;
      let inferenceCompleted = false;

      logAndPush('Initializing @imgly/background-removal-node engine');

      // Convert binary buffer to Web Blob to route decoded data safely
      imageBlob = new Blob([buffer], { type: mimeType });
      
      // Nullify raw base64 content immediately to release massive string references
      base64Content = null;
      if (req.body) {
        req.body.image_b64 = ''; // release body reference
      }

      // Setup a 60-second timeout to prevent failures in cloud containers and accommodate first-time model downloads
      const timeoutMs = 60000;
      const removeTask = removeBackground(imageBlob, {
        model: 'small',
        publicPath: hasCopiedAssets ? `file://${tempAssetsDir}/` : undefined,
        output: {
          format: 'image/png',
          quality: 1.0
        },
        progress: (key, current, total) => {
          if (key.startsWith('fetch:')) {
            if (!downloadStarted) {
              downloadStarted = true;
              logAndPush('Model download started');
            }
          } else if (key === 'compute:inference') {
            if (downloadStarted && !downloadCompleted) {
              downloadCompleted = true;
              logAndPush('Model download completed');
            } else if (!downloadStarted && !downloadCompleted) {
              downloadCompleted = true;
              logAndPush('Model check: Model already cached locally');
              logAndPush('Model download completed');
            }

            if (current === 0 && !inferenceStarted) {
              inferenceStarted = true;
              logAndPush('Inference started');
              logMemoryProfile('INFERENCE-STARTED');
            } else if (current === 1 && !inferenceCompleted) {
              inferenceCompleted = true;
              logAndPush('Inference completed');
              logMemoryProfile('INFERENCE-FINISHED');
            }
          }
        }
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('REMBG_TIMEOUT')), timeoutMs);
      });

      blob = await Promise.race([removeTask, timeoutPromise]);
      logMemoryProfile('INFERENCE-PROMISE-RESOLVED');
      
      // Release input blob and original buffer instantly
      imageBlob = null;
      buffer = null;

      // Fallback safeties to guarantee logs are outputted:
      if (!downloadCompleted) {
        logAndPush('Model download completed');
      }
      if (!inferenceStarted) {
        logAndPush('Inference started');
      }
      if (!inferenceCompleted) {
        logAndPush('Inference completed');
      }

      // Convert the returned Blob back to a base64-encoded transparent PNG
      imageBuffer = await blob.arrayBuffer();
      outputBuffer = Buffer.from(imageBuffer);
      const processedLength = outputBuffer.length;

      // release raw inference blob
      blob = null;

      logAndPush('Verifying backend output integrity and decoding PNG structure');
      let width = 0;
      let height = 0;
      try {
        const pngObj = PNG.sync.read(outputBuffer);
        width = pngObj.width;
        height = pngObj.height;
        logAndPush(`PNG structure verified successfully. Decoded dimensions: ${width}x${height}`);
      } catch (pngErr: any) {
        logAndPush(`WARNING: PNG verification failed: ${pngErr.message}`);
        console.error('PNG error during validation:', pngErr);
      }

      const base64Png = outputBuffer.toString('base64');
      const pngDataUrl = `data:image/png;base64,${base64Png}`;

      // Release output buffer immediately after base64 conversion
      outputBuffer = null;
      imageBuffer = null;

      logAndPush('rembg completed successfully');
      logAndPush('PNG returned to client');
      logMemoryProfile('PRE-RESPONSE-SEND');

      // Schedule proactive garbage collection if supported
      if (global && typeof (global as any).gc === 'function') {
        try {
          (global as any).gc();
          console.log('[MEMORY ENGINE] Successfully executed proactive Node manual garbage collection.');
        } catch (_) {}
      }

      return res.json({
        success: true,
        image_b64: pngDataUrl,
        mimeType: 'image/png',
        fileExtension: '.png',
        originalSize: originalLength,
        processedSize: processedLength,
        width,
        height,
        logs: serverLogs
      });

    } catch (error: any) {
      console.error('\n================== BACKEND DEBUGLOG: FAILURE POINT IDENTIFIED ==================');
      console.error('ERROR OCCURRED DURING BACKGROUND REMOVAL PIPELINE:');
      console.error('Error Message:', error.message || error);
      console.error('Error Stack:', error.stack);
      console.error('=================================================================================\n');

      // Clean up buffers in case of errors
      base64Content = null;
      buffer = null;
      imageBlob = null;
      blob = null;
      imageBuffer = null;
      outputBuffer = null;

      if (global && typeof (global as any).gc === 'function') {
        try { (global as any).gc(); } catch (_) {}
      }

      const status = error.message === 'REMBG_TIMEOUT' ? 504 : 500;
      const errorLabel = error.message === 'REMBG_TIMEOUT' ? 'REMBG_TIMEOUT' : 'INTERNAL_SERVER_ERROR';
      const userMessage = error.message === 'REMBG_TIMEOUT' 
        ? 'Local background removal operation timed out (60-second timeout reached).'
        : (error.message || 'An unexpected failure occurred while executing local background removal.');

      return res.status(status).json({
        error: errorLabel,
        message: userMessage,
        details: error.stack || undefined
      });
    }
  });

  // Global Error Handler to catch body-parser 413, malformed JSON 400, or other Express runtime exceptions
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[EXPRESS GLOBAL ERROR HANDLER]:', err);
    
    const statusCode = err.status || err.statusCode || 500;
    
    // If it's an API route or client expects JSON, always respond with JSON to prevent HTML parsing errors on frontend
    if (req.path.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(statusCode).json({
        error: err.code || err.type || 'SERVER_ERROR',
        message: err.message || 'An unhandled server-side error occurred inside our Express pipeline.',
        details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
      });
    }
    
    next(err);
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully started and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
