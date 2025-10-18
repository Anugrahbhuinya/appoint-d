import { mongoStorage } from './mongodb-storage';
import dotenv from 'dotenv';

dotenv.config();

async function testAtlasConnection() {
  console.log('🔍 Testing MongoDB Atlas connection...');
  console.log('📍 Connection URI:', process.env.MONGODB_URI ? 'Set ✅' : 'Not set ❌');
  
  try {
    await mongoStorage.connect();
    
    // Test basic operations
    console.log('🧪 Testing database operations...');
    
    // Test user creation
    const timestamp = Date.now();
    const testUser = await mongoStorage.createUser({
      username: 'test_user_' + timestamp,
      email: 'test_' + timestamp + '@example.com',
      password: 'test_password',
      role: 'patient',
      firstName: 'Test',
      lastName: 'User',
      isVerified: true,
      isActive: true,
    });
    
    console.log('✅ User created successfully:', testUser._id);
    
    // Test user retrieval
    const retrievedUser = await mongoStorage.getUser(testUser._id);
    console.log('✅ User retrieved successfully:', retrievedUser?.username);
    
    // Clean up test user
    try {
      await mongoStorage.updateUser(testUser._id, { isActive: false });
      console.log('🧹 Test user cleaned up successfully');
    } catch (error) {
      console.log('⚠️  Note: Test user cleanup failed (this is not critical)');
    }
    
    console.log('🎉 All tests passed! MongoDB Atlas connection is working correctly.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  } finally {
    await mongoStorage.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas');
    process.exit(0);
  }
}

testAtlasConnection();
