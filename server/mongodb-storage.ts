import mongoose, { Types } from "mongoose";
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from "dotenv";
import fs from "fs/promises";
import { format } from "date-fns";
import {
  User,
  DoctorProfile,
  Appointment,
  DoctorDocument,
  PatientRecord,
  DoctorAvailability,
  Payment,
  Dispute,
  Notification,
  type IUser,
  type IDoctorProfile,
  type IAppointment,
  type IDoctorDocument,
  type IPatientRecord,
  type IDoctorAvailability,
  type IPayment,
  type IDispute,
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

const convertIsoToJsDay = (isoDay: number): number => {
  return isoDay === 7 ? 0 : isoDay;
};

const convertJsDayToIso = (jsDay: number): number => {
  return jsDay === 0 ? 7 : jsDay;
};

const normalizeDateKey = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid specificDate provided");
  }
  return format(date, "yyyy-MM-dd");
};

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

  // === USER METHODS ===
  async getUser(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    return (await User.findById(id)) || undefined;
  }

  async getUserByUsername(username: string) {
    return (await User.findOne({ username })) || undefined;
  }

  async getUserByEmail(email: string) {
    return (await User.findOne({ email })) || undefined;
  }

  async createUser(data: InsertUser) {
    const user = new User(data);
    return await user.save();
  }

  async updateUser(id: string, updates: Partial<IUser>) {
    console.log(`\n💾 [Storage: updateUser] Updating user ${id}`);
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
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
    return await this.updateUser(userId, { isVerified } as any);
  }

  // === DOCTOR PROFILE METHODS ===
  async createDoctorProfile(profile: InsertDoctorProfile) {
    const docProfile = new DoctorProfile(profile);
    return await docProfile.save();
  }

  async getDoctorProfile(userId: string) {
    return (await DoctorProfile.findOne({ userId })) || undefined;
  }

  async updateDoctorProfile(userId: string, updates: Partial<IDoctorProfile>) {
    const profile = await DoctorProfile.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!profile) throw new Error("Doctor profile not found");
    return profile;
  }

  async getDoctorsWithProfiles(): Promise<(IUser & { profile: IDoctorProfile })[]> {
    const doctorUsers = await User.find({ role: "doctor" });
    const profiles = await DoctorProfile.find({});
    
    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p.userId.toString(), p));

    return doctorUsers
      .map(user => {
        const profile = profileMap.get(user._id.toString());
        return profile ? { ...user.toObject(), profile: profile.toObject() } : null;
      })
      .filter((d): d is any => d !== null);
  }

  // === APPOINTMENT METHODS ===
  async createAppointment(appointment: InsertAppointment) {
    const newAppointment = new Appointment(appointment);
    return await newAppointment.save();
  }

  async getAppointment(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    return (await Appointment.findById(id)) || undefined;
  }

  async getAppointmentsByPatient(patientId: string) {
    return await Appointment.find({ patientId }).sort({ appointmentDate: -1 });
  }

  async getAppointmentsByDoctor(doctorId: string) {
    return await Appointment.find({ doctorId }).sort({ appointmentDate: -1 });
  }

  // ✅ Supports Persistent Video Rooms and Call Metrics
  async updateAppointment(id: string, updates: Partial<IAppointment>) {
    console.log(`\n💾 [Storage: updateAppointment] Syncing fields:`, Object.keys(updates));
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!appointment) throw new Error("Appointment not found");
    return appointment;
  }

  async getAllAppointments() {
    return await Appointment.find().sort({ createdAt: -1 });
  }

  // === DOCTOR AVAILABILITY METHODS ===
 // === DOCTOR AVAILABILITY METHODS ===
async createDoctorAvailability(data: InsertDoctorAvailability) {
  const prepared = { 
    ...data, 
    dayOfWeek: data.dayOfWeek
  };
  const newAvailability = new DoctorAvailability(prepared);
  return await newAvailability.save();
}

async getDoctorAvailability(doctorId: string, dayOfWeek: number) {
  const jsDay = convertIsoToJsDay(dayOfWeek);
  const slots = await DoctorAvailability.find({ doctorId, dayOfWeek: jsDay })
    .lean()
    .sort({ startTime: 1 });
  
  return slots.map(slot => ({
    _id: slot._id?.toString() || "",
    doctorId: slot.doctorId,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime || "09:00",
    endTime: slot.endTime || "17:00",
    isAvailable: slot.isAvailable ?? true,
    specificDate: slot.specificDate || undefined,
  }));
}

async getAllDoctorAvailability(doctorId: string) {
  const slots = await DoctorAvailability.find({ doctorId })
    .lean()
    .sort({ dayOfWeek: 1, startTime: 1 });
  
  return slots.map(slot => ({
    _id: slot._id?.toString() || "",
    doctorId: slot.doctorId,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime || "09:00",
    endTime: slot.endTime || "17:00",
    isAvailable: slot.isAvailable ?? true,
    specificDate: slot.specificDate || undefined,
  }));
}

async getDoctorAvailabilityByDate(doctorId: string, dateStr: string) {
  const normalizedDate = normalizeDateKey(dateStr);
  const slots = await DoctorAvailability.find({ 
    doctorId, 
    specificDate: normalizedDate 
  })
    .lean()
    .sort({ startTime: 1 });
  
  return slots.map(slot => ({
    _id: slot._id?.toString() || "",
    doctorId: slot.doctorId,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime || "09:00",
    endTime: slot.endTime || "17:00",
    isAvailable: slot.isAvailable ?? true,
    specificDate: slot.specificDate || undefined,
  }));
}

async updateDoctorAvailability(id: string, updates: Partial<IDoctorAvailability>) {
  const slot = await DoctorAvailability.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();

  if (!slot) throw new Error("Availability slot not found");
  
  return {
    _id: slot._id?.toString() || "",
    doctorId: slot.doctorId,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime || "09:00",
    endTime: slot.endTime || "17:00",
    isAvailable: slot.isAvailable ?? true,
    specificDate: slot.specificDate || undefined,
  };
}

async deleteDoctorAvailability(id: string) {
  return await DoctorAvailability.findByIdAndDelete(id);
}

  // === NOTIFICATION METHODS ===
  async createNotification(data: any) {
    const notification = new Notification(data);
    return await notification.save();
  }

  async getNotificationsByRecipient(recipientId: string) {
    return await Notification.find({ recipientId }).sort({ createdAt: -1 }).limit(50);
  }

  async updateNotification(notificationId: string, updates: any) {
    return await Notification.findByIdAndUpdate(notificationId, { $set: updates }, { new: true });
  }

  async deleteNotification(notificationId: string) {
    return await Notification.findByIdAndDelete(notificationId);
  }

  // === PAYMENT METHODS ===
  async createPayment(payment: InsertPayment) {
    const newPayment = new Payment(payment);
    return await newPayment.save();
  }

  async getPaymentByOrderId(orderId: string) {
    return await Payment.findOne({ razorpayOrderId: orderId });
  }

  async updatePaymentStatus(orderId: string, status: string, paymentId?: string) {
    const updates: any = { status };
    if (paymentId) updates.razorpayPaymentId = paymentId;
    return await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, { $set: updates }, { new: true });
  }

  async getPaymentsByPatient(patientId: string) {
  if (!patientId) return await Payment.find().lean();
  return await Payment.find({ patientId }).lean();
}

  // === DOCUMENT & RECORD METHODS ===
  async createDoctorDocument(document: InsertDoctorDocument) {
    const doc = new DoctorDocument(document);
    return await doc.save();
  }

  async getDoctorDocuments(doctorId: string) {
    return await DoctorDocument.find({ doctorId });
  }

  async deleteDoctorDocument(id: string) {
    const doc = await DoctorDocument.findById(id);
    if (doc?.filePath) await fs.unlink(doc.filePath).catch(() => {});
    return await DoctorDocument.findByIdAndDelete(id);
  }

  async createPatientRecord(record: InsertPatientRecord) {
    const newRecord = new PatientRecord(record);
    return await newRecord.save();
  }

  async getPatientRecords(patientId: string) {
    return await PatientRecord.find({ patientId });
  }

  async deletePatientRecord(id: string) {
    const record = await PatientRecord.findById(id);
    if (record?.filePath) await fs.unlink(record.filePath).catch(() => {});
    return await PatientRecord.findByIdAndDelete(id);
  }

  // === DISPUTE METHODS ===
  async createDispute(dispute: InsertDispute) {
    const newDispute = new Dispute(dispute);
    return await newDispute.save();
  }

  async getAllDisputes() {
    return await Dispute.find().sort({ createdAt: -1 });
  }
}

export const storage = new MongoStorage();