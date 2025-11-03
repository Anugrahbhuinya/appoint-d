import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs/promises";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { AddressInfo } from "net";

dotenv.config();
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api', generalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/upload', uploadLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Create uploads directories if they don't exist
(async () => {
  try {
    await fs.mkdir(path.join(process.cwd(), 'public', 'uploads', 'doctor-profiles'), { recursive: true });
    await fs.mkdir(path.join(process.cwd(), 'uploads'), { recursive: true });
    console.log('✅ Upload directories ready');
  } catch (error) {
    console.error('❌ Failed to create upload directories:', error);
  }
})();

// Serve static files - MUST be before registerRoutes
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const pathStr = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathStr.startsWith("/api")) {
      let logLine = `${req.method} ${pathStr} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Main startup function
(async () => {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await storage.connect();
    console.log('✅ MongoDB connected');

    // Register API routes
    console.log('📝 Registering routes...');
    const server = await registerRoutes(app);
    console.log('✅ Routes registered');

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('❌ Error:', message);
      res.status(status).json({ message });
      throw err;
    });

    // Setup Vite or static serving
    if (app.get("env") === "development") {
      console.log('🚀 Setting up Vite for development...');
      await setupVite(app, server);
    } else {
      console.log('📦 Serving static files for production...');
      serveStatic(app);
    }

    // Start server
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(port, "127.0.0.1", () => {
      log(`✅ Server running on http://localhost:${port}`);
      log(`📁 Uploads served from: /uploads/doctor-profiles/`);
      log(`📂 Static files from: ${path.join(process.cwd(), 'public', 'uploads')}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();