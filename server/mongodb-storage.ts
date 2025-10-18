import mongoose from 'mongoose';
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from 'dotenv';
import fs from 'fs/promises'; // Import file system module for physical deletion
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

  // Doctor documents
  createDoctorDocument(document: InsertDoctorDocument): Promise<DoctorDocument>;
  getDoctorDocument(id: string): Promise<DoctorDocument | null>;
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
  getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]>;
  updateDoctorAvailability(id: string, updates: Partial<DoctorAvailability>): Promise<DoctorAvailability>;
  deleteDoctorAvailability(id: string): Promise<DoctorAvailability | null>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentByOrderId(orderId: string): Promise<Payment | undefined>;
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
  
  // Assuming the route needs this for validation (though it wasn't defined in the storage contract)
  async getAppointmentsByDoctorAndDate(doctorId: string, appointmentDate: Date) {
      return await Appointment.find({ 
          doctorId, 
          appointmentDate: { $gte: appointmentDate, $lt: new Date(appointmentDate.getTime() + 60 * 60 * 1000) } // Example: 1 hour slot check
      });
  }


  // =======================
  // DOCTOR DOCUMENT METHODS
  // =======================
  async createDoctorDocument(document: InsertDoctorDocument) {
    const doc = new DoctorDocument(document);
    return await doc.save();
  }

  async getDoctorDocument(id: string) {
    return await DoctorDocument.findById(id);
  }

  async getDoctorDocuments(doctorId: string) {
    return await DoctorDocument.find({ doctorId });
  }
  
  async deleteDoctorDocument(documentId: string): Promise<DoctorDocument | null> {
    const doc = await DoctorDocument.findById(documentId);
    if (!doc) return null;

    try {
      // 1. Physically delete the file from the disk
      await fs.unlink(doc.filePath);
      console.log(`Successfully deleted physical file: ${doc.filePath}`);
    } catch (err: any) {
      // If the file doesn't exist (ENOENT), ignore the error but log it
      if (err.code !== 'ENOENT') { 
        console.error(`Failed to delete physical file ${doc.filePath} (possibly file server error, continuing DB deletion):`, err);
      } else {
        console.warn(`Physical file not found for deletion, continuing DB cleanup: ${doc.filePath}`);
      }
    }

    // 2. Delete from database
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
  // =======================
  async createDoctorAvailability(data: InsertDoctorAvailability) {
    // FIX: Renaming parameter to avoid redeclaration error
    const newAvailability = new DoctorAvailability(data); 
    return await newAvailability.save();
  }

  async getDoctorAvailability(doctorId: string) {
    return await DoctorAvailability.find({ doctorId }).sort({ dayOfWeek: 1, startTime: 1 });
  }

  async updateDoctorAvailability(id: string, updates: Partial<DoctorAvailability>) {
    const availability = await DoctorAvailability.findByIdAndUpdate(id, updates, { new: true });
    if (!availability) throw new Error("Availability not found");
    return availability;
  }

  async deleteDoctorAvailability(id: string): Promise<DoctorAvailability | null> {
    const result = await DoctorAvailability.findByIdAndDelete(id);
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
      // Admin request → return all payments
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

  async getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    return await Payment.findOne({ razorpayOrderId: orderId }) || undefined;
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
  // ADMIN METHODS
  // =======================
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
