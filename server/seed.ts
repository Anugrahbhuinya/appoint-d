import { mongoStorage } from './mongodb-storage';
import dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoStorage.connect();
    
    console.log('Seeding database...');
    await mongoStorage.seedData();
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
