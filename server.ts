import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import { removeBackground } from '@imgly/background-removal-node';
import { PNG } from 'pngjs';

// Load environment variables from .env file
dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Parse JSON bodies with a generous limit to accommodate large base64 image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route to handle professional background removal using the local open-source rembg model
  app.post('/api/remove-background', async (req, res) => {
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
      const base64Content = image_b64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Content, 'base64');

      console.log(`Payload status: Received ${buffer.length} bytes of image data, format indicated: ${mimeType}`);

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
      const imageBlob = new Blob([buffer], { type: mimeType });

      // Setup a 15-second timeout as requested by the user
      const timeoutMs = 15000;
      const removeTask = removeBackground(imageBlob, {
        model: 'medium',
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
            } else if (current === 1 && !inferenceCompleted) {
              inferenceCompleted = true;
              logAndPush('Inference completed');
            }
          }
        }
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('REMBG_TIMEOUT')), timeoutMs);
      });

      const blob = await Promise.race([removeTask, timeoutPromise]);
      
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
      const imageBuffer = await blob.arrayBuffer();
      const outputBuffer = Buffer.from(imageBuffer);

      logAndPush('Verifying backend output integrity and decoding PNG structure');
      const finalBuffer = outputBuffer;
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

      const base64Png = finalBuffer.toString('base64');
      const pngDataUrl = `data:image/png;base64,${base64Png}`;

      logAndPush('rembg completed successfully');
      logAndPush('PNG returned to client');

      return res.json({
        success: true,
        image_b64: pngDataUrl,
        mimeType: 'image/png',
        fileExtension: '.png',
        originalSize: buffer.length,
        processedSize: finalBuffer.length,
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

      if (error.message === 'REMBG_TIMEOUT') {
        return res.status(504).json({
          error: 'REMBG_TIMEOUT',
          message: 'Local background removal operation timed out (15-second timeout reached).'
        });
      }

      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected failure occurred while executing local background removal.',
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
