import { storage as mongoStorage, MongoStorage } from "./mongodb-storage";
import type { IStorage } from "./mongodb-storage"; // type-only import
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from "dotenv";

dotenv.config();
const MemoryStore = createMemoryStore(session);

// Re-export MongoStorage as a real class
export { MongoStorage } from "./mongodb-storage";

// Re-export IStorage as a type
export type { IStorage } from "./mongodb-storage";

// Export the MongoDB storage instance
export const storage = mongoStorage;
