import { storage } from './storage';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();
const scryptAsync = promisify(_scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUser() {
  try {
    console.log('Connecting to MongoDB...');
    await storage.connect();
    
    // Check if admin already exists
    const existingAdmin = await storage.getUserByUsername('admin');
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }
    
    // Create admin user
    const adminUser = await storage.createUser({
      username: "admin",
      email: "admin@mediconnect.com",
      password: await hashPassword("admin123"), // You should change this password
      role: "admin",
      firstName: "Admin",
      lastName: "User",
      isVerified: true,
      isActive: true,
    });
    
    console.log('Admin user created successfully:', adminUser.username);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();