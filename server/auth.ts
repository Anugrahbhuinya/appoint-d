import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/mongodb-schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (identifier, password, done) => {
      console.log(`--- Login Attempt ---`);
      console.log(`Received identifier: ${identifier}`);
      
      try {
        // Try to find the user by username first
        let user = await storage.getUserByUsername(identifier);
        
        // If no user found by username, try to find by email
        if (!user) {
          user = await storage.getUserByEmail(identifier);
        }

        if (!user) {
          console.log(`Login Failed: User with identifier '${identifier}' not found.`);
          console.log(`--- End of Login Attempt ---`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        console.log(`Found user: ${user.username}`);
        
        const passwordsMatch = await comparePasswords(password, user.password);
        
        if (!passwordsMatch) {
          console.log(`Login Failed: Incorrect password for user '${user.username}'.`);
          console.log(`--- End of Login Attempt ---`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        console.log(`Login Succeeded for user: ${user.username}`);
        console.log(`--- End of Login Attempt ---`);
        
        // Convert to plain object before returning to Passport
        return done(null, user.toObject()); 
        
      } catch (error) {
        console.error("Authentication error:", error);
        console.log(`--- End of Login Attempt ---`);
        return done(error);
      }
    }),
  );

  // Serialize stores just the ID
  passport.serializeUser((user, done) => done(null, user._id));
  
  // Deserialize retrieves the ID and attaches the full user object to req.user
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      
      // FIX: Convert Mongoose Document to plain object for reliable access in routes
      if (user) {
        done(null, user.toObject());
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });
}
