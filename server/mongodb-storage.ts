import mongoose from 'mongoose';
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from 'dotenv';
import fs from 'fs/promises';
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
} from "@shared/mongodb-schema";

dotenv.config();
const MemoryStore = createMemoryStore(session);

// ===========================
// --- HELPER FUNCTIONS ---
// ===========================

/**
 * 🛑 CRITICAL FIX: Single source of truth for day conversions
 * 
 * Frontend uses ISO standard: 1=Monday, 2=Tuesday, ..., 7=Sunday (from getISODay())
 * Database stores JS standard: 0=Sunday, 1=Monday, ..., 6=Saturday
 * 
 * These functions ensure proper conversion in both directions
 */

/**
 * Convert ISO day (1-7 from getISODay()) to JS day (0-6) for database storage
 * ISO: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
 * JS:  1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
 */
const convertIsoToJsDay = (isoDay: number): number => {
  return isoDay === 7 ? 0 : isoDay;
};

/**
 * Convert JS day (0-6) from database to ISO day (1-7) for API responses
 * JS:  0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 * ISO: 7=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 */
const convertJsDayToIso = (jsDay: number): number => {
  return jsDay === 0 ? 7 : jsDay;
};

// ===========================
// INTERFACE: STORAGE CONTRACT
// ===========================
export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUserVerification(userId: string, isVerified: boolean): Promise<User>; 
  updateUserStatus(userId: string, isActive: boolean): Promise<User>;

  // Doctor profiles
  createDoctorProfile(profile: InsertDoctorProfile): Promise<DoctorProfile>;
  getDoctorProfile(userId: string): Promise<DoctorProfile | undefined>;
  getDoctorProfiles(): Promise<DoctorProfile[]>;
  updateDoctorProfile(userId: string, updates: Partial<DoctorProfile>): Promise<DoctorProfile>;
  getDoctorsWithProfiles(): Promise<(User & { profile: DoctorProfile })[]>;

  // Appointments
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]>;
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentByOrderId(orderId: string): Promise<Appointment | undefined>;
  getAppointmentsByDoctorAndDate(doctorId: string, appointmentDate: Date): Promise<Appointment[]>;
  getAppointmentsByDoctorAndDay(doctorId: string, dayOfWeek: number): Promise<Appointment[]>;

  // Doctor documents
  createDoctorDocument(document: InsertDoctorDocument): Promise<DoctorDocument>;
  getDoctorDocuments(doctorId: string): Promise<DoctorDocument[]>;
  updateDoctorDocument(id: string, updates: Partial<DoctorDocument>): Promise<DoctorDocument>;
  getAllPendingDocuments(): Promise<DoctorDocument[]>;
  deleteDoctorDocument(documentId: string): Promise<DoctorDocument | null>; 

  // Patient records
  createPatientRecord(record: InsertPatientRecord): Promise<PatientRecord>;
  getPatientRecords(patientId: string): Promise<PatientRecord[]>;
  updatePatientRecord(id: string, updates: Partial<PatientRecord>): Promise<PatientRecord>;

  // Doctor availability
  createDoctorAvailability(availability: InsertDoctorAvailability): Promise<DoctorAvailability>;
  getDoctorAvailability(doctorId: string, dayOfWeek: number): Promise<DoctorAvailability[]>; 
  getAllDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]>;
  updateDoctorAvailability(id: string, updates: Partial<DoctorAvailability>): Promise<DoctorAvailability>;
  deleteDoctorAvailability(id: string): Promise<DoctorAvailability | null>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByPatient(patientId: string): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment>;
  updatePaymentStatus(orderId: string, status: string, paymentId?: string): Promise<Payment>;

  // Disputes
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  getDispute(id: string): Promise<Dispute | undefined>;
  getAllDisputes(): Promise<Dispute[]>;
  updateDispute(id: string, updates: Partial<Dispute>): Promise<Dispute>;

  // Session
  sessionStore: any;
}

// ===========================
// CLASS: MONGO STORAGE
// ===========================
export class MongoStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  async connect(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/appointd";

    if (!process.env.MONGODB_URI) {
      console.warn("⚠️ MONGODB_URI not found in .env — using local MongoDB instance.");
    }

    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
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

  // =======================
  // USER METHODS
  // =======================
  async getUser(id: string) {
    return await User.findById(id) || undefined;
  }

  async getUserByUsername(username: string) {
    return await User.findOne({ username }) || undefined;
  }

  async getUserByEmail(email: string) {
    return await User.findOne({ email }) || undefined;
  }

  async createUser(data: InsertUser) {
    const user = new User(data);
    return await user.save();
  }

  async updateUser(id: string, updates: Partial<User>) {
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) throw new Error("User not found");
    return user;
  }

  async getAllUsers() {
    return await User.find();
  }

  async getUsersByRole(role: string) {
    return await User.find({ role });
  }
  
  async updateUserVerification(userId: string, isVerified: boolean) {
    const user = await User.findByIdAndUpdate(userId, { isVerified }, { new: true });
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true });
    if (!user) throw new Error("User not found");
    return user;
  }

  // =======================
  // DOCTOR PROFILE METHODS
  // =======================
  async createDoctorProfile(profile: InsertDoctorProfile) {
    const docProfile = new DoctorProfile(profile);
    return await docProfile.save();
  }

  async getDoctorProfile(userId: string) {
    return await DoctorProfile.findOne({ userId }) || undefined;
  }

  async getDoctorProfiles() {
    return await DoctorProfile.find();
  }

  async updateDoctorProfile(userId: string, updates: Partial<DoctorProfile>) {
    const profile = await DoctorProfile.findOneAndUpdate({ userId }, updates, { new: true });
    if (!profile) throw new Error("Doctor profile not found");
    return profile;
  }

  async getDoctorsWithProfiles() {
    const doctors = await User.find({ role: "doctor" });
    const results: (User & { profile: DoctorProfile })[] = [];

    for (const doctor of doctors) {
      const profile = await this.getDoctorProfile(doctor._id.toString());
      if (profile) {
        results.push({ ...doctor.toObject(), profile: profile.toObject() } as User & { profile: DoctorProfile });
      }
    }

    return results;
  }

  // =======================
  // APPOINTMENT METHODS
  // =======================
  async createAppointment(appointment: InsertAppointment) {
    const newAppointment = new Appointment(appointment);
    return await newAppointment.save();
  }

  async getAppointment(id: string) {
    return await Appointment.findById(id) || undefined;
  }

  async getAppointmentsByPatient(patientId: string) {
    return await Appointment.find({ patientId });
  }

  async getAppointmentsByDoctor(doctorId: string) {
    return await Appointment.find({ doctorId });
  }

  async updateAppointment(id: string, updates: Partial<Appointment>) {
    const appointment = await Appointment.findByIdAndUpdate(id, updates, { new: true });
    if (!appointment) throw new Error("Appointment not found");
    return appointment;
  }

  async getAllAppointments() {
    return await Appointment.find();
  }
  
  async getAppointmentByOrderId(orderId: string): Promise<Appointment | undefined> {
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) return undefined;
    return await Appointment.findById(payment.appointmentId) || undefined;
  }
  
  async getAppointmentsByDoctorAndDate(doctorId: string, appointmentDate: Date) {
    return await Appointment.find({ 
      doctorId, 
      appointmentDate: { 
        $gte: appointmentDate, 
        $lt: new Date(appointmentDate.getTime() + 60 * 60 * 1000) 
      } 
    });
  }

  async getAppointmentsByDoctorAndDay(doctorId: string, dayOfWeek: number) {
    return await Appointment.find({ doctorId, dayOfWeek: dayOfWeek });
  }

  // =======================
  // DOCTOR DOCUMENT METHODS
  // =======================
  async createDoctorDocument(document: InsertDoctorDocument) {
    const doc = new DoctorDocument(document);
    return await doc.save();
  }

  async getDoctorDocuments(doctorId: string) {
    return await DoctorDocument.find({ doctorId });
  }
  
  async deleteDoctorDocument(documentId: string): Promise<DoctorDocument | null> {
    const doc = await DoctorDocument.findById(documentId);
    if (!doc) return null;

    try {
      await fs.unlink(doc.filePath);
      console.log(`Successfully deleted physical file: ${doc.filePath}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') { 
        console.error(`Failed to delete physical file ${doc.filePath}:`, err);
      } else {
        console.warn(`Physical file not found: ${doc.filePath}`);
      }
    }

    const deletedDoc = await DoctorDocument.findByIdAndDelete(documentId);
    return deletedDoc;
  }

  async updateDoctorDocument(id: string, updates: Partial<DoctorDocument>) {
    const doc = await DoctorDocument.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) throw new Error("Doctor document not found");
    return doc;
  }

  async getAllPendingDocuments() {
    return await DoctorDocument.find({ isVerified: false });
  }

  // =======================
  // PATIENT RECORD METHODS
  // =======================
  async createPatientRecord(record: InsertPatientRecord) {
    const newRecord = new PatientRecord(record);
    return await newRecord.save();
  }

  async getPatientRecords(patientId: string) {
    return await PatientRecord.find({ patientId });
  }

  async updatePatientRecord(id: string, updates: Partial<PatientRecord>) {
    const record = await PatientRecord.findByIdAndUpdate(id, updates, { new: true });
    if (!record) throw new Error("Patient record not found");
    return record;
  }

 // =======================
  // DOCTOR AVAILABILITY METHODS
  // 🛑 CRITICAL: These methods now use consistent ISO↔JS conversion
  // =======================
  
  async createDoctorAvailability(data: InsertDoctorAvailability) {
    console.log("📝 [createDoctorAvailability]");
    console.log("   Input dayOfWeek (ISO):", data.dayOfWeek);
    
    // Frontend sends ISO (1-7), convert to JS (0-6) for storage
    const convertedData = {
      ...data,
      dayOfWeek: convertIsoToJsDay(data.dayOfWeek)
    };
    
    console.log("   Converted dayOfWeek (JS):", convertedData.dayOfWeek);
    
    const newAvailability = new DoctorAvailability(convertedData);
    const saved = await newAvailability.save();
    
    console.log("   ✅ Saved with JS day:", saved.dayOfWeek);
    
    return saved;
  }

 async getDoctorAvailability(doctorId: string, dayOfWeek: number) {
  console.log("🔍 [getDoctorAvailability]");
  console.log("   doctorId:", doctorId);
  console.log("   dayOfWeek (ISO):", dayOfWeek);
  
  const jsDay = convertIsoToJsDay(dayOfWeek);
  
  console.log("   Converted to JS day:", jsDay);

  const result = await DoctorAvailability.find({
    doctorId: doctorId,
    dayOfWeek: jsDay
    // ✅ REMOVED: isAvailable: true (we'll check this in the appointment booking)
  }).sort({ startTime: 1 }).lean();

  console.log("   Found", result.length, "slots");

  if (result.length === 0) {
    console.warn("   ⚠️ No availability slots found for doctor on this day");
  }

  const converted = result.map((slot: any) => ({
    ...slot,
    dayOfWeek: convertJsDayToIso(slot.dayOfWeek)
  }));
  
  console.log("   Converted back to ISO, returning", converted.length, "slots");
  
  return converted;
}

  async getAllDoctorAvailability(doctorId: string) {
    console.log("🔍 [getAllDoctorAvailability]");
    console.log("   doctorId:", doctorId);
    
    // Fetch all availability slots, convert JS to ISO for frontend
    const result = await DoctorAvailability.find({ doctorId })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();  // 🛑 FIX: Use .lean() to get plain objects

    console.log("   Found", result.length, "total slots");

    const converted = result.map((slot: any) => ({
      ...slot,
      dayOfWeek: convertJsDayToIso(slot.dayOfWeek)
    }));
    
    console.log("   Converted to ISO format, returning", converted.length, "slots");
    console.log("   Converted data:", converted);
    
    return converted;
  }

  async updateDoctorAvailability(id: string, updates: Partial<DoctorAvailability>) {
    console.log("✏️ [updateDoctorAvailability]");
    console.log("   id:", id);
    console.log("   updates:", updates);
    
    // If updating dayOfWeek, convert from ISO to JS
    const convertedUpdates = {
      ...updates,
      ...(updates.dayOfWeek !== undefined && { dayOfWeek: convertIsoToJsDay(updates.dayOfWeek) })
    };

    console.log("   Converted updates:", convertedUpdates);

    const availability = await DoctorAvailability.findByIdAndUpdate(id, convertedUpdates, { new: true });
    if (!availability) {
      console.error("❌ Availability not found");
      throw new Error("Availability not found");
    }

    console.log("   ✅ Updated successfully");

    // Convert back to ISO before returning
    const obj = availability.toObject ? availability.toObject() : availability;
    return {
      ...obj,
      dayOfWeek: convertJsDayToIso(obj.dayOfWeek)
    };
  }

  async deleteDoctorAvailability(id: string): Promise<DoctorAvailability | null> {
    console.log("🗑️ [deleteDoctorAvailability]");
    console.log("   id:", id);
    
    const result = await DoctorAvailability.findByIdAndDelete(id);
    
    if (result) {
      console.log("   ✅ Deleted successfully");
    } else {
      console.log("   ⚠️ Not found");
    }
    
    return result;
  }

  // =======================
  // PAYMENT METHODS
  // =======================
  async createPayment(payment: InsertPayment) {
    const newPayment = new Payment(payment);
    return await newPayment.save();
  }

  async getPayment(id: string) {
    return await Payment.findById(id) || undefined;
  }

  async getPaymentsByPatient(patientId: string) {
    if (!patientId) {
      return await Payment.find().sort({ createdAt: -1 });
    }
    return await Payment.find({ patientId }).sort({ createdAt: -1 });
  }

  async getAllPayments() {
    return await Payment.find();
  }

  async updatePayment(id: string, updates: Partial<Payment>) {
    const payment = await Payment.findByIdAndUpdate(id, updates, { new: true });
    if (!payment) throw new Error("Payment not found");
    return payment;
  }
  
  async updatePaymentStatus(orderId: string, status: string, paymentId?: string): Promise<Payment> {
    const updates: any = { status };
    if (paymentId) {
      updates.razorpayPaymentId = paymentId;
    }
    const payment = await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, updates, { new: true });
    if (!payment) {
      throw new Error("Payment not found");
    }
    return payment;
  }

  // =======================
  // DISPUTE METHODS
  // =======================
  async createDispute(dispute: InsertDispute) {
    const newDispute = new Dispute(dispute);
    return await newDispute.save();
  }

  async getDispute(id: string) {
    return await Dispute.findById(id) || undefined;
  }

  async getAllDisputes() {
    return await Dispute.find();
  }

  async updateDispute(id: string, updates: Partial<Dispute>) {
    const dispute = await Dispute.findByIdAndUpdate(id, updates, { new: true });
    if (!dispute) throw new Error("Dispute not found");
    if (updates.status === "resolved" && !dispute.resolvedAt) {
      dispute.resolvedAt = new Date();
      await dispute.save();
    }
    return dispute;
  }


  
// =======================
// NOTIFICATION METHODS
// =======================

async createNotification(data: any) {
  try {
    console.log("📢 [createNotification]");
    console.log("   type:", data.type);
    console.log("   recipient:", data.recipientId);
    
    const notification = new Notification(data);
    const saved = await notification.save();
    
    console.log("   ✅ Notification created:", saved._id);
    
    return saved;
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    throw error;
  }
}

async getNotificationsByRecipient(recipientId: string) {
  try {
    console.log("📖 [getNotificationsByRecipient]");
    console.log("   recipientId:", recipientId);
    
    const notifications = await Notification.find({ recipientId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    console.log("   ✅ Found", notifications.length, "notifications");
    
    return notifications;
  } catch (error) {
    console.error("❌ Error getting notifications:", error);
    throw error;
  }
}

async updateNotification(notificationId: string, updates: any) {
  try {
    console.log("✏️ [updateNotification]");
    console.log("   notificationId:", notificationId);
    console.log("   updates:", updates);
    
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      updates,
      { new: true }
    ).lean();
    
    if (!notification) {
      throw new Error("Notification not found");
    }
    
    console.log("   ✅ Updated successfully");
    
    return notification;
  } catch (error) {
    console.error("❌ Error updating notification:", error);
    throw error;
  }
}

async deleteNotification(notificationId: string) {
  try {
    console.log("🗑️ [deleteNotification]");
    console.log("   notificationId:", notificationId);
    
    await Notification.findByIdAndDelete(notificationId);
    
    console.log("   ✅ Deleted successfully");
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    throw error;
  }
}

async getUnreadNotificationsCount(recipientId: string) {
  try {
    return await Notification.countDocuments({ 
      recipientId, 
      read: false 
    });
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    throw error;
  }
}

async markAllNotificationsAsRead(recipientId: string) {
  try {
    console.log("✔️ [markAllNotificationsAsRead]");
    console.log("   recipientId:", recipientId);
    
    const result = await Notification.updateMany(
      { recipientId, read: false },
      { read: true }
    );
    
    console.log("   ✅ Marked", result.modifiedCount, "notifications as read");
    
    return result;
  } catch (error) {
    console.error("❌ Error marking as read:", error);
    throw error;
  }
}

  // =======================
  // ADMIN METHODS
  // =======================
  async getAllDocuments() {
    return await DoctorDocument.find()
      .populate("doctorId", "firstName lastName email")
      .sort({ uploadedAt: -1 });
  }

  async updateDocumentVerification(documentId: string, isVerified: boolean, rejectionReason?: string) {
    const updates: any = { isVerified, rejectionReason: rejectionReason || null };
    
    const doc = await DoctorDocument.findByIdAndUpdate(documentId, updates, { new: true });
    if (!doc) throw new Error("Document not found");
    return doc;
  }
}

// Export a singleton instance
export const storage = new MongoStorage();