import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();

  // Parse JSON bodies with a standard limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Health check endpoint for deployment container checks
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date()
    });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[EXPRESS GLOBAL ERROR HANDLER]:', err);
    const statusCode = err.status || err.statusCode || 500;
    
    if (req.path.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(statusCode).json({
        error: err.code || err.type || 'SERVER_ERROR',
        message: err.message || 'An unhandled server-side error occurred inside our Express pipeline.'
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
