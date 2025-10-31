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
import { MongoClient, Db } from "mongodb";

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 uploads per minute
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

// ============================================
// IMPORTANT: SERVE STATIC FILES BEFORE ROUTES
// This ensures file requests are handled before
// the catch-all route in registerRoutes
// ============================================

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

// ============================================

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

// --- MongoDB connection (singleton) ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "appointd";

let mongoClient: MongoClient | null = null;
let dbInstance: Db | null = null;

async function connectMongo() {
  if (dbInstance) return dbInstance;
  mongoClient = new MongoClient(MONGODB_URI, {});

  await mongoClient.connect();
  dbInstance = mongoClient.db(DB_NAME);
  console.log("Connected to MongoDB:", MONGODB_URI, "db:", DB_NAME);
  return dbInstance;
}

function getDoctorsCollection() {
  if (!dbInstance) throw new Error("DB not initialized");
  return dbInstance.collection("doctors");
}

// ============================================
// IMPORTANT: SERVE STATIC FILES BEFORE ROUTES
// This ensures file requests are handled before
// the catch-all route in registerRoutes
// ============================================

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

// ============================================

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

// Simple logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API endpoints ---

// GET /api/doctors - return doctors from MongoDB (basic list)
app.get("/api/doctors", async (_req, res) => {
  try {
    await connectMongo();
    const coll = getDoctorsCollection();
    // limit to 100 for safety, projection can be adjusted
    const docs = await coll
      .find({}, { projection: { password: 0, /* exclude sensitive fields */ } })
      .limit(100)
      .toArray();
    res.json(docs);
  } catch (err) {
    console.error("GET /api/doctors error", err);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// GET /api/search?query=...&location=...&category=...
// category = 'doctors' -> search MongoDB collection
// otherwise -> OpenStreetMap Nominatim search (places)
app.get("/api/search", async (req, res) => {
  try {
    const q = (req.query.query as string) || "";
    const location = (req.query.location as string) || "";
    const category = (req.query.category as string) || "";

    // Heuristic: treat as doctors search when category=doctors OR query mentions doctor/dr
    if (
      category.toLowerCase() === "doctors" ||
      (!category && /doctor|dr|\bmd\b/i.test(q))
    ) {
      await connectMongo();
      const coll = getDoctorsCollection();

      // Build text/regex filters: search name, specialization, bio, city
      const filters: any[] = [];
      const trimmed = q.trim();
      if (trimmed) {
        const re = new RegExp(trimmed.split(/\s+/).join("|"), "i");
        filters.push({
          $or: [
            { firstName: re },
            { lastName: re },
            { "profile.specialization": re },
            { email: re },
            { "profile.bio": re },
          ],
        });
      }
      if (location.trim()) {
        const locRe = new RegExp(location.trim().split(/\s+/).join("|"), "i");
        filters.push({
          $or: [{ city: locRe }, { "profile.city": locRe }, { "profile.address": locRe }],
        });
      }

      const queryFilter = filters.length ? { $and: filters } : {};

      // fetch matched doctors
      const docs = await coll
        .find(queryFilter, {
          projection: {
            password: 0,
            // include relevant fields; adjust as needed
            firstName: 1,
            lastName: 1,
            email: 1,
            city: 1,
            profile: 1,
          },
        })
        .limit(50)
        .toArray();

      const results = docs.map((d: any) => ({
        type: "doctor",
        id: d._id,
        title: `${d.firstName} ${d.lastName}`,
        description: `${d.profile?.specialization ?? ""} • ${d.city ?? ""} • ${d.profile?.experience ?? ""} yrs`,
        specialization: d.profile?.specialization,
        consultationFee: d.profile?.consultationFee,
        rating: d.profile?.rating,
        source: "mongodb",
        raw: d,
      }));

      return res.json({ results });
    }

    // For places use OpenStreetMap Nominatim
    const searchQuery = [q, category, location].filter(Boolean).join(" ").trim();
    if (!searchQuery) return res.json({ results: [] });

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      searchQuery
    )}&addressdetails=1&limit=12`;

    const fetchRes = await fetch(nominatimUrl, {
      headers: { "User-Agent": "appointd-app/1.0 (contact@example.com)" },
    });
    if (!fetchRes.ok) {
      return res.status(502).json({ error: "Failed to query place provider" });
    }
    const places = await fetchRes.json();

    const results = (places || []).map((p: any) => {
      const title = p.display_name;
      const type = p.type || p.class || "place";
      const address = (p.address && Object.values(p.address).join(", ")) || "";
      return {
        type: "place",
        title,
        description: address,
        lat: p.lat,
        lon: p.lon,
        placeType: type,
        source: "nominatim",
      };
    });

    return res.json({ results });
  } catch (err) {
    console.error("search error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Start server only after connecting to DB (so errors surface early)
async function start() {
  try {
    await connectMongo();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    // continue starting the server but /api/doctors and doctor-search will fail
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  const server = app.listen(PORT, () => {
    const addr = server.address() as AddressInfo;
    console.log(`API server listening on http://localhost:${addr.port}`);
  });

  // optional: handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("Shutting down...");
    try {
      await mongoClient?.close();
    } catch {}
    server.close(() => process.exit(0));
  });
}

start();