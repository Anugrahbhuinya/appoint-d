import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function deleteAllData() {
  console.log('💥 DANGER: This will PERMANENTLY DELETE ALL DATA!');
  console.log('🚨 This action cannot be undone!');
  
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/appointd';
    
    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI not found in environment variables. Using local MongoDB.');
    }

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get database name from connection string
    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'appointd';
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    console.log(`📊 Database: ${dbName}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections:`);
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} documents`);
    }
    
    // Clear all data from collections (but keep collections)
    console.log('\n🗑️  Clearing all data from collections...');
    
    for (const collection of collections) {
      try {
        const result = await db.collection(collection.name).deleteMany({});
        console.log(`   ✅ Cleared ${result.deletedCount} documents from: ${collection.name}`);
      } catch (error) {
        console.log(`   ⚠️  Could not clear ${collection.name}: ${error}`);
      }
    }
    
    console.log('\n🎉 All data has been cleared from collections!');
    console.log('📝 Your collections are now empty but still exist, ready for fresh data.');
    
  } catch (error) {
    console.error('❌ Delete operation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas');
    process.exit(0);
  }
}

// Add confirmation prompt
console.log('💀 NUCLEAR OPTION: Complete Data Deletion 💀');
console.log('This will PERMANENTLY DELETE ALL DATA from your MongoDB Atlas database.');
console.log('This action CANNOT be undone!');
console.log('\nPress Ctrl+C to cancel, or wait 10 seconds to continue...');

setTimeout(() => {
  deleteAllData();
}, 10000);





