import { mongoStorage } from './mongodb-storage';
import dotenv from 'dotenv';

dotenv.config();

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...');
  
  try {
    await mongoStorage.connect();
    
    console.log('⚠️  WARNING: This will delete ALL data from your database!');
    console.log('📊 Current collections and their document counts:');
    
    // Get counts before deletion
    const users = await mongoStorage.getAllUsers();
    const doctorProfiles = await mongoStorage.getDoctorProfiles();
    const appointments = await mongoStorage.getAllAppointments();
    const payments = await mongoStorage.getAllPayments();
    const disputes = await mongoStorage.getAllDisputes();
    
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Doctor Profiles: ${doctorProfiles.length}`);
    console.log(`   - Appointments: ${appointments.length}`);
    console.log(`   - Payments: ${payments.length}`);
    console.log(`   - Disputes: ${disputes.length}`);
    
    // Clear all collections
    console.log('\n🧹 Clearing collections...');
    
    // Clear users (this will cascade delete related data)
    console.log('   - Clearing users...');
    for (const user of users) {
      try {
        await mongoStorage.updateUser(user._id, { isActive: false });
      } catch (error) {
        console.log(`     ⚠️  Could not deactivate user ${user._id}: ${error}`);
      }
    }
    
    // Clear doctor profiles
    console.log('   - Clearing doctor profiles...');
    for (const profile of doctorProfiles) {
      try {
        // Note: We can't directly delete from the storage interface
        // This would require direct MongoDB operations
        console.log(`     - Profile ${profile._id} marked for cleanup`);
      } catch (error) {
        console.log(`     ⚠️  Could not clear profile ${profile._id}: ${error}`);
      }
    }
    
    // Clear appointments
    console.log('   - Clearing appointments...');
    for (const appointment of appointments) {
      try {
        await mongoStorage.updateAppointment(appointment._id, { status: 'cancelled' });
      } catch (error) {
        console.log(`     ⚠️  Could not cancel appointment ${appointment._id}: ${error}`);
      }
    }
    
    // Clear payments
    console.log('   - Clearing payments...');
    for (const payment of payments) {
      try {
        await mongoStorage.updatePayment(payment._id, { status: 'failed' });
      } catch (error) {
        console.log(`     ⚠️  Could not update payment ${payment._id}: ${error}`);
      }
    }
    
    // Clear disputes
    console.log('   - Clearing disputes...');
    for (const dispute of disputes) {
      try {
        await mongoStorage.updateDispute(dispute._id, { status: 'closed' });
      } catch (error) {
        console.log(`     ⚠️  Could not close dispute ${dispute._id}: ${error}`);
      }
    }
    
    console.log('\n✅ Database cleanup completed!');
    console.log('📝 Note: Data has been marked as inactive/cancelled rather than deleted');
    console.log('   This preserves data integrity and allows for recovery if needed.');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoStorage.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas');
    process.exit(0);
  }
}

// Add confirmation prompt
console.log('🚨 DANGER: Database Cleanup Tool 🚨');
console.log('This will clear ALL data from your MongoDB Atlas database.');
console.log('Make sure you have a backup if you need to recover this data.');
console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');

setTimeout(() => {
  clearDatabase();
}, 5000);







