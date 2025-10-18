import mongoose from 'mongoose';
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from 'dotenv';
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
  type InsertDispute
} from '@shared/mongodb-schema';

dotenv.config();
const MemoryStore = createMemoryStore(session);

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

  // Doctor documents
  createDoctorDocument(document: InsertDoctorDocument): Promise<DoctorDocument>;
  getDoctorDocuments(doctorId: string): Promise<DoctorDocument[]>;
  getAllDocuments(): Promise<DoctorDocument[]>;
  updateDocumentVerification(documentId: string, isVerified: boolean, rejectionReason?: string): Promise<DoctorDocument>;

  // Patient records
  createPatientRecord(record: InsertPatientRecord): Promise<PatientRecord>;
  getPatientRecords(patientId: string): Promise<PatientRecord[]>;
  getPatientRecordsByDoctor(doctorId: string): Promise<PatientRecord[]>;

  // Doctor availability
  createDoctorAvailability(availability: InsertDoctorAvailability): Promise<DoctorAvailability>;
  getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]>;
  updateDoctorAvailability(id: string, updates: Partial<DoctorAvailability>): Promise<DoctorAvailability>;
  deleteDoctorAvailability(id: string): Promise<void>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByPatient(patientId: string): Promise<Payment[]>;
  updatePaymentStatus(orderId: string, status: string, paymentId?: string): Promise<Payment>;

  // Disputes
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  getDisputesByUser(userId: string): Promise<Dispute[]>;
  getAllDisputes(): Promise<Dispute[]>;
  updateDispute(id: string, updates: Partial<Dispute>): Promise<Dispute>;
}

export class MongoStorage implements IStorage {
  async connect(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
      return;
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB Atlas");
  }

  getSessionStore() {
    return MemoryStore;
  }

  // User management methods
  async getUser(id: string): Promise<User | undefined> {
    const user = await User.findById(id);
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await User.findOne({ username });
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await User.findOne({ email });
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser = new User(user);
    return await newUser.save();
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await User.find().sort({ createdAt: -1 });
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await User.find({ role }).sort({ createdAt: -1 });
  }

  // NEW ADMIN METHODS
  async updateUserVerification(userId: string, isVerified: boolean): Promise<User> {
    const user = await User.findByIdAndUpdate(userId, { isVerified }, { new: true });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  // Doctor profile methods
  async createDoctorProfile(profile: InsertDoctorProfile): Promise<DoctorProfile> {
    const doctorProfile = new DoctorProfile(profile);
    return await doctorProfile.save();
  }

  async getDoctorProfile(userId: string): Promise<DoctorProfile | undefined> {
    const profile = await DoctorProfile.findOne({ userId });
    return profile || undefined;
  }

  async getDoctorProfiles(): Promise<DoctorProfile[]> {
    return await DoctorProfile.find();
  }

  async updateDoctorProfile(userId: string, updates: Partial<DoctorProfile>): Promise<DoctorProfile> {
    const profile = await DoctorProfile.findOneAndUpdate({ userId }, updates, { new: true });
    if (!profile) {
      throw new Error("Doctor profile not found");
    }
    return profile;
  }

  async getDoctorsWithProfiles(): Promise<(User & { profile: DoctorProfile })[]> {
    const doctors = await User.find({ role: "doctor" });
    const doctorsWithProfiles = [];
    
    for (const doctor of doctors) {
      const profile = await this.getDoctorProfile(doctor._id.toString());
      if (profile) {
        doctorsWithProfiles.push({ ...doctor.toObject(), profile });
      }
    }
    
    return doctorsWithProfiles;
  }

  // Appointment methods
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const newAppointment = new Appointment(appointment);
    return await newAppointment.save();
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const appointment = await Appointment.findById(id);
    return appointment || undefined;
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return await Appointment.find({ patientId }).sort({ appointmentDate: -1 });
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    return await Appointment.find({ doctorId }).sort({ appointmentDate: -1 });
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const appointment = await Appointment.findByIdAndUpdate(id, updates, { new: true });
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    return appointment;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await Appointment.find().sort({ createdAt: -1 });
  }

  // Doctor document methods
  async createDoctorDocument(document: InsertDoctorDocument): Promise<DoctorDocument> {
    const newDocument = new DoctorDocument(document);
    return await newDocument.save();
  }

  async getDoctorDocuments(doctorId: string): Promise<DoctorDocument[]> {
    return await DoctorDocument.find({ doctorId }).sort({ uploadedAt: -1 });
  }

  // NEW ADMIN DOCUMENT METHODS
  async getAllDocuments(): Promise<DoctorDocument[]> {
    return await DoctorDocument.find().populate('doctorId', 'firstName lastName email').sort({ uploadedAt: -1 });
  }

  async updateDocumentVerification(documentId: string, isVerified: boolean, rejectionReason?: string): Promise<DoctorDocument> {
    const updates: any = { isVerified };
    if (!isVerified && rejectionReason) {
      updates.rejectionReason = rejectionReason;
    }
    const document = await DoctorDocument.findByIdAndUpdate(documentId, updates, { new: true });
    if (!document) {
      throw new Error("Document not found");
    }
    return document;
  }

  // Patient record methods
  async createPatientRecord(record: InsertPatientRecord): Promise<PatientRecord> {
    const newRecord = new PatientRecord(record);
    return await newRecord.save();
  }

  async getPatientRecords(patientId: string): Promise<PatientRecord[]> {
    return await PatientRecord.find({ patientId }).sort({ uploadedAt: -1 });
  }

  async getPatientRecordsByDoctor(doctorId: string): Promise<PatientRecord[]> {
    return await PatientRecord.find({ doctorId }).sort({ uploadedAt: -1 });
  }

  // Doctor availability methods
  async createDoctorAvailability(availability: InsertDoctorAvailability): Promise<DoctorAvailability> {
    const newAvailability = new DoctorAvailability(availability);
    return await newAvailability.save();
  }

  async getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]> {
    return await DoctorAvailability.find({ doctorId }).sort({ dayOfWeek: 1, startTime: 1 });
  }

  async updateDoctorAvailability(id: string, updates: Partial<DoctorAvailability>): Promise<DoctorAvailability> {
    const availability = await DoctorAvailability.findByIdAndUpdate(id, updates, { new: true });
    if (!availability) {
      throw new Error("Availability not found");
    }
    return availability;
  }

  async deleteDoctorAvailability(id: string): Promise<void> {
    const result = await DoctorAvailability.findByIdAndDelete(id);
    if (!result) {
      throw new Error("Availability not found");
    }
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const newPayment = new Payment(payment);
    return await newPayment.save();
  }

  async getPaymentsByPatient(patientId: string): Promise<Payment[]> {
    if (patientId === "") {
      // Get all payments for admin
      return await Payment.find().sort({ createdAt: -1 });
    }
    return await Payment.find({ patientId }).sort({ createdAt: -1 });
  }

  async updatePaymentStatus(orderId: string, status: string, paymentId?: string): Promise<Payment> {
    const updates: any = { status };
    if (paymentId) {
      updates.paymentId = paymentId;
    }
    const payment = await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, updates, { new: true });
    if (!payment) {
      throw new Error("Payment not found");
    }
    return payment;
  }

  // Dispute methods
  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    const newDispute = new Dispute(dispute);
    return await newDispute.save();
  }

  async getDisputesByUser(userId: string): Promise<Dispute[]> {
    return await Dispute.find({ reportedBy: userId }).sort({ createdAt: -1 });
  }

  async getAllDisputes(): Promise<Dispute[]> {
    return await Dispute.find().sort({ createdAt: -1 });
  }

  async updateDispute(id: string, updates: Partial<Dispute>): Promise<Dispute> {
    const dispute = await Dispute.findByIdAndUpdate(id, updates, { new: true });
    if (!dispute) {
      throw new Error("Dispute not found");
    }
    return dispute;
  }
}

export const storage = new MongoStorage();
