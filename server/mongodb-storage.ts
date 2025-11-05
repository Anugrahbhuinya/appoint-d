import mongoose, { Types } from 'mongoose';
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { Notification } from "../shared/mongodb-schema";
import {
  User,
  DoctorProfile,
  Appointment,
  DoctorDocument,
  PatientRecord,
  DoctorAvailability,
  Payment,
  Dispute,
  type InsertUser,
  type InsertDoctorProfile,
  type InsertAppointment,
  type InsertDoctorDocument,
  type InsertPatientRecord,
  type InsertDoctorAvailability,
  type InsertPayment,
  type InsertDispute,
} from "@shared/mongodb-schema"; // Assuming this file defines your Mongoose Models

dotenv.config();
const MemoryStore = createMemoryStore(session);

// ===========================
// --- HELPER FUNCTIONS ---
// ===========================

const convertIsoToJsDay = (isoDay: number): number => {
  return isoDay === 7 ? 0 : isoDay;
};

const convertJsDayToIso = (jsDay: number): number => {
  return jsDay === 0 ? 7 : jsDay;
};

// ===========================
// INTERFACE: STORAGE CONTRACT (omitted for brevity, assume correct)
// ===========================

// ===========================
// CLASS: MONGO STORAGE
// ===========================
export class MongoStorage {
  public sessionStore: any;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async connect(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
    try {
      await mongoose.connect(mongoUri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000, });
      console.log("✅ Connected to MongoDB");
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }

  // === USER METHODS (omitted for brevity) ===
  async getUser(id: string) { return await User.findById(id) || undefined; }
  async getUserByUsername(username: string) { return await User.findOne({ username }) || undefined; }
  async getUserByEmail(email: string) { return await User.findOne({ email }) || undefined; }
  async createUser(data: InsertUser) { const user = new User(data); return await user.save(); }
  async updateUser(id: string, updates: Partial<User>) { const user = await User.findByIdAndUpdate(id, updates, { new: true }); if (!user) throw new Error("User not found"); return user; }
  async getAllUsers() { return await User.find(); }
  async getUsersByRole(role: string) { return await User.find({ role }); }
  async updateUserVerification(userId: string, isVerified: boolean) { const user = await User.findByIdAndUpdate(userId, { isVerified }, { new: true }); if (!user) throw new Error("User not found"); return user; }
  async updateUserStatus(userId: string, isActive: boolean) { const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true }); if (!user) throw new Error("User not found"); return user; }

  // === DOCTOR PROFILE METHODS ===
  async createDoctorProfile(profile: InsertDoctorProfile) { const docProfile = new DoctorProfile(profile); return await docProfile.save(); }
  async getDoctorProfile(userId: string) { return await DoctorProfile.findOne({ userId }) || undefined; }
  async getDoctorProfiles() { return await DoctorProfile.find(); }
  async updateDoctorProfile(userId: string, updates: Partial<DoctorProfile>) {
  console.log(`\n💾 [updateDoctorProfile] Starting update`);
  console.log(`   userId: ${userId}`);
  console.log(`   updates:`, Object.keys(updates));
  
  try {
    // CRITICAL: Add { new: true } to return updated document
    const profile = await DoctorProfile.findOneAndUpdate(
      { userId }, 
      { $set: updates },  // ← Use $set operator for explicit updates
      { new: true }       // ← MUST HAVE: Returns updated doc, not original
    );
    
    if (!profile) {
      console.error(`   ❌ Profile not found for userId: ${userId}`);
      throw new Error("Doctor profile not found");
    }
    
    console.log(`   ✅ Profile updated successfully`);
    console.log(`   Updated fields:`, Object.keys(updates));
    console.log(`   isApproved is now: ${profile.isApproved}`);
    
    return profile;
  } catch (error: any) {
    console.error(`   ❌ Error in updateDoctorProfile:`, error.message);
    throw error;
  }
}
// ===================================================================================================
// 🛑 FINAL FIX: Bypassing Aggregation with In-Memory Join (Guaranteed to work)
// ===================================================================================================
// In your storage.ts, replace the getDoctorsWithProfiles method with this:

async getDoctorsWithProfiles(): Promise<(User & { profile: DoctorProfile })[]> {
  console.log("\n🔄🔄🔄 [getDoctorsWithProfiles] JS IN-MEMORY JOIN CALLED 🔄🔄🔄");
  
  try {
    // 1. Fetch all doctor users (case-insensitive role check)
    const doctorUsers = await User.find({ 
      role: { $regex: /^doctor$/, $options: 'i' } 
    }).lean();

    console.log(`✅ Step 1: Found ${doctorUsers.length} potential doctor users.`);
    if (doctorUsers.length === 0) return [];
    
    // 2. Fetch all doctor profiles
    const profiles = await DoctorProfile.find({}).lean();
    console.log(`✅ Step 2: Found ${profiles.length} total profiles.`);

    // Create a map for fast lookup: Profile UserID (string) -> Profile Object
    const profileMap = new Map<string, DoctorProfile>();
    profiles.forEach((p: any) => {
        const userIdKey = p.userId instanceof Types.ObjectId ? p.userId.toString() : p.userId;
        profileMap.set(userIdKey, p as DoctorProfile);
    });
    console.log(`Map built with ${profileMap.size} unique profiles.`);

    // 3. Join in memory
    const results: (User & { profile: DoctorProfile })[] = [];

    doctorUsers.forEach((user: any) => {
    // Convert _id to string - handle both ObjectId and string cases
    const userKey = typeof user._id === 'string' ? user._id : user._id?.toString?.() || String(user._id);
    console.log(`   Looking for profile for user ${user.firstName}: userKey="${userKey}"`);
    const profile = profileMap.get(userKey);

        if (profile) {
            // ✅ CHANGED: Include ALL doctors with profiles, regardless of approval status
            // This allows you to see doctors in development/testing
            results.push({ ...user, profile: profile } as any);
            
            // Log approval status for debugging
            if (profile.isApproved === true) {
                console.log(`✅ Doctor ${user.firstName} ${user.lastName}: APPROVED`);
            } else {
                console.log(`⚠️ Doctor ${user.firstName} ${user.lastName}: NOT APPROVED (pending admin review)`);
            }
        } else {
            console.log(`⚠️ Doctor ${user.firstName} ${user.lastName} skipped: No profile created yet`);
        }
    });

    console.log(`✅ JS IN-MEMORY JOIN SUCCESS: ${results.length} doctors retrieved.`);
    return results;
  } catch (error: any) {
    console.error("\n❌❌❌ [getDoctorsWithProfiles] JS IN-MEMORY ERROR ❌❌❌");
    console.error("Message:", error.message);
    throw error;
  }
}
// ===================================================================================================

  // === APPOINTMENT METHODS (omitted for brevity) ===
  async createAppointment(appointment: InsertAppointment) { const newAppointment = new Appointment(appointment); return await newAppointment.save(); }
  async getAppointment(id: string) { return await Appointment.findById(id) || undefined; }
  async getAppointmentsByPatient(patientId: string) { return await Appointment.find({ patientId }); }
  async getAppointmentsByDoctor(doctorId: string) { return await Appointment.find({ doctorId }); }
  async updateAppointment(id: string, updates: Partial<Appointment>) { const appointment = await Appointment.findByIdAndUpdate(id, updates, { new: true }); if (!appointment) throw new Error("Appointment not found"); return appointment; }
  async getAllAppointments() { return await Appointment.find(); }
  async getAppointmentByOrderId(orderId: string): Promise<Appointment | undefined> { const payment = await Payment.findOne({ razorpayOrderId: orderId }); if (!payment) return undefined; return await Appointment.findById(payment.appointmentId) || undefined; }
  async getAppointmentsByDoctorAndDate(doctorId: string, appointmentDate: Date) { return await Appointment.find({ doctorId, appointmentDate: { $gte: appointmentDate, $lt: new Date(appointmentDate.getTime() + 60 * 60 * 1000) } }); }
  async getAppointmentsByDoctorAndDay(doctorId: string, dayOfWeek: number) { return await Appointment.find({ doctorId, dayOfWeek: dayOfWeek }); }

  // === DOCTOR DOCUMENT METHODS (omitted for brevity) ===
  async createDoctorDocument(document: InsertDoctorDocument) { const doc = new DoctorDocument(document); return await doc.save(); }
  async getDoctorDocuments(doctorId: string) { return await DoctorDocument.find({ doctorId }); }
  
  async deleteDoctorDocument(documentId: string): Promise<DoctorDocument | null> {
  try {
    console.log(`\n🗑️ [deleteDoctorDocument in storage]`);
    console.log(`   documentId: ${documentId}`);
    
    // Find the document first
    let doc;
    try {
      doc = await DoctorDocument.findById(documentId);
    } catch (dbErr: any) {
      console.error(`   ❌ Error finding document:`, dbErr.message);
      return null;
    }
    
    if (!doc) {
      console.log(`   ❌ Document not found in database`);
      return null;
    }
    
    console.log(`   Found document: ${doc.fileName}`);
    console.log(`   File path: ${doc.filePath}`);
    
    // Try to delete the physical file if it exists
    if (doc.filePath) {
      try {
        console.log(`   Attempting to delete file: ${doc.filePath}`);
        await fs.unlink(doc.filePath);
        console.log(`   ✅ Physical file deleted successfully`);
      } catch (fileErr: any) {
        // Log but don't fail - we still want to delete the DB record
        if (fileErr.code === 'ENOENT') {
          console.warn(`   ⚠️ Physical file not found (already deleted): ${doc.filePath}`);
        } else {
          console.warn(`   ⚠️ Could not delete physical file (${fileErr.code}): ${fileErr.message}`);
        }
        // Continue - don't re-throw
      }
    }
    
    // Delete from database
    console.log(`   Deleting from MongoDB...`);
    let deletedDoc;
    try {
      deletedDoc = await DoctorDocument.findByIdAndDelete(documentId);
      if (deletedDoc) {
        console.log(`   ✅ Document record deleted from database`);
      } else {
        console.warn(`   ⚠️ Document was not deleted (might have been deleted already)`);
      }
    } catch (dbDeleteErr: any) {
      console.error(`   ❌ Error deleting from database:`, dbDeleteErr.message);
      throw dbDeleteErr;
    }
    
    return deletedDoc;
  } catch (error: any) {
    console.error(`   ❌ Error in deleteDoctorDocument:`, error.message);
    console.error(`   Stack:`, error.stack);
    throw error;
  }
}
  async updateDoctorDocument(id: string, updates: Partial<DoctorDocument>) { const doc = await DoctorDocument.findByIdAndUpdate(id, updates, { new: true }); if (!doc) throw new Error("Doctor document not found"); return doc; }
  async getAllPendingDocuments() { return await DoctorDocument.find({ isVerified: false }); }

  // === PATIENT RECORD METHODS (omitted for brevity) ===
  async createPatientRecord(record: InsertPatientRecord) { const newRecord = new PatientRecord(record); return await newRecord.save(); }
  async getPatientRecords(patientId: string) { return await PatientRecord.find({ patientId }); }
  async updatePatientRecord(id: string, updates: Partial<PatientRecord>) { const record = await PatientRecord.findByIdAndUpdate(id, updates, { new: true }); if (!record) throw new Error("Patient record not found"); return record; }

  // === DOCTOR AVAILABILITY METHODS (omitted for brevity) ===
  async createDoctorAvailability(data: InsertDoctorAvailability) { console.log("📝 [createDoctorAvailability]"); console.log("   Input dayOfWeek (ISO):", data.dayOfWeek); const convertedData = { ...data, dayOfWeek: convertIsoToJsDay(data.dayOfWeek) }; console.log("   Converted dayOfWeek (JS):", convertedData.dayOfWeek); const newAvailability = new DoctorAvailability(convertedData); const saved = await newAvailability.save(); console.log("   ✅ Saved with JS day:", saved.dayOfWeek); return saved; }
 async getDoctorAvailability(doctorId: string, dayOfWeek: number) { console.log("🔍 [getDoctorAvailability]"); console.log("   doctorId:", doctorId); console.log("   dayOfWeek (ISO):", dayOfWeek); const jsDay = convertIsoToJsDay(dayOfWeek); console.log("   Converted to JS day:", jsDay); const result = await DoctorAvailability.find({ doctorId: doctorId, dayOfWeek: jsDay }).sort({ startTime: 1 }).lean(); console.log("   Found", result.length, "slots"); if (result.length === 0) { console.warn("   ⚠️ No availability slots found for doctor on this day"); } const converted = result.map((slot: any) => ({ ...slot, dayOfWeek: convertJsDayToIso(slot.dayOfWeek) })); console.log("   Converted back to ISO, returning", converted.length, "slots"); return converted; }
  async getAllDoctorAvailability(doctorId: string) { console.log("🔍 [getAllDoctorAvailability]"); console.log("   doctorId:", doctorId); const result = await DoctorAvailability.find({ doctorId }).sort({ dayOfWeek: 1, startTime: 1 }).lean(); console.log("   Found", result.length, "total slots"); const converted = result.map((slot: any) => ({ ...slot, dayOfWeek: convertJsDayToIso(slot.dayOfWeek) })); console.log("   Converted to ISO format, returning", converted.length, "slots"); console.log("   Converted data:", converted); return converted; }
  async updateDoctorAvailability(id: string, updates: Partial<DoctorAvailability>) { console.log("✏️ [updateDoctorAvailability]"); console.log("   id:", id); console.log("   updates:", updates); const convertedUpdates = { ...updates, ...(updates.dayOfWeek !== undefined && { dayOfWeek: convertIsoToJsDay(updates.dayOfWeek) }) }; console.log("   Converted updates:", convertedUpdates); const availability = await DoctorAvailability.findByIdAndUpdate(id, convertedUpdates, { new: true }); if (!availability) { console.error("❌ Availability not found"); throw new Error("Availability not found"); } console.log("   ✅ Updated successfully"); const obj = availability.toObject ? availability.toObject() : availability; return { ...obj, dayOfWeek: convertJsDayToIso(obj.dayOfWeek) }; }
  async deleteDoctorAvailability(id: string): Promise<DoctorAvailability | null> { console.log("🗑️ [deleteDoctorAvailability]"); console.log("   id:", id); const result = await DoctorAvailability.findByIdAndDelete(id); if (result) { console.log("   ✅ Deleted successfully"); } else { console.log("   ⚠️ Not found"); } return result; }

  // === PAYMENT METHODS (omitted for brevity) ===
  async createPayment(payment: InsertPayment) { const newPayment = new Payment(payment); return await newPayment.save(); }
  async getPayment(id: string) { return await Payment.findById(id) || undefined; }
  async getPaymentsByPatient(patientId: string) { if (!patientId) { return await Payment.find().sort({ createdAt: -1 }); } return await Payment.find({ patientId }).sort({ createdAt: -1 }); }
  async getAllPayments() { return await Payment.find(); }
  async updatePayment(id: string, updates: Partial<Payment>) { const payment = await Payment.findByIdAndUpdate(id, updates, { new: true }); if (!payment) throw new Error("Payment not found"); return payment; }
  async updatePaymentStatus(orderId: string, status: string, paymentId?: string): Promise<Payment> { const updates: any = { status }; if (paymentId) { updates.razorpayPaymentId = paymentId; } const payment = await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, updates, { new: true }); if (!payment) { throw new Error("Payment not found"); } return payment; }

  // === DISPUTE METHODS (omitted for brevity) ===
  async createDispute(dispute: InsertDispute) { const newDispute = new Dispute(dispute); return await newDispute.save(); }
  async getDispute(id: string) { return await Dispute.findById(id) || undefined; }
  async getAllDisputes() { return await Dispute.find(); }
  async updateDispute(id: string, updates: Partial<Dispute>) { const dispute = await Dispute.findByIdAndUpdate(id, updates, { new: true }); if (!dispute) throw new Error("Dispute not found"); if (updates.status === "resolved" && !dispute.resolvedAt) { dispute.resolvedAt = new Date(); await dispute.save(); } return dispute; }

  // === NOTIFICATION METHODS (omitted for brevity) ===
  async createNotification(data: any) { try { console.log("📢 [createNotification]"); console.log("   type:", data.type); console.log("   recipient:", data.recipientId); const notification = new Notification(data); const saved = await notification.save(); console.log("   ✅ Notification created:", saved._id); return saved; } catch (error) { console.error("❌ Error creating notification:", error); throw error; } }
  async getNotificationsByRecipient(recipientId: string) { try { console.log("📖 [getNotificationsByRecipient]"); console.log("   recipientId:", recipientId); const notifications = await Notification.find({ recipientId }).sort({ createdAt: -1 }).limit(50).lean(); console.log("   ✅ Found", notifications.length, "notifications"); return notifications; } catch (error) { console.error("❌ Error getting notifications:", error); throw error; } }
  async updateNotification(notificationId: string, updates: any) { try { console.log("✏️ [updateNotification]"); console.log("   notificationId:", notificationId); console.log("   updates:", updates); const notification = await Notification.findByIdAndUpdate( notificationId, updates, { new: true } ).lean(); if (!notification) { throw new Error("Notification not found"); } console.log("   ✅ Updated successfully"); return notification; } catch (error) { console.error("❌ Error updating notification:", error); throw error; } }
  async deleteNotification(notificationId: string) { try { console.log("🗑️ [deleteNotification]"); console.log("   notificationId:", notificationId); await Notification.findByIdAndDelete(notificationId); console.log("   ✅ Deleted successfully"); } catch (error) { console.error("❌ Error deleting notification:", error); throw error; } }
  async getUnreadNotificationsCount(recipientId: string) { try { return await Notification.countDocuments({ recipientId, read: false }); } catch (error) { console.error("❌ Error getting unread count:", error); throw error; } }
  async markAllNotificationsAsRead(recipientId: string) { try { console.log("✔️ [markAllNotificationsAsRead]"); console.log("   recipientId:", recipientId); const result = await Notification.updateMany( { recipientId, read: false }, { read: true } ); console.log("   ✅ Marked", result.modifiedCount, "notifications as read"); return result; } catch (error) { console.error("❌ Error marking as read:", error); throw error; } }

  // === ADMIN METHODS (omitted for brevity) ===
  async getAllDocuments() { return await DoctorDocument.find().populate("doctorId", "firstName lastName email").sort({ uploadedAt: -1 }); }
  async updateDocumentVerification(documentId: string, isVerified: boolean, rejectionReason?: string) { const updates: any = { isVerified, rejectionReason: rejectionReason || null }; const doc = await DoctorDocument.findByIdAndUpdate(documentId, updates, { new: true }); if (!doc) throw new Error("Document not found"); return doc; }
}

// Export a singleton instance
export const storage = new MongoStorage();
