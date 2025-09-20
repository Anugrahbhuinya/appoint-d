import { type User, type InsertUser, type DoctorProfile, type InsertDoctorProfile, type Appointment, type InsertAppointment, type DoctorDocument, type InsertDoctorDocument, type PatientRecord, type InsertPatientRecord, type DoctorAvailability, type InsertDoctorAvailability, type Payment, type InsertPayment, type Dispute, type InsertDispute } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from 'dotenv';
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
  updateDoctorDocument(id: string, updates: Partial<DoctorDocument>): Promise<DoctorDocument>;
  getAllPendingDocuments(): Promise<DoctorDocument[]>;

  // Patient records
  createPatientRecord(record: InsertPatientRecord): Promise<PatientRecord>;
  getPatientRecords(patientId: string): Promise<PatientRecord[]>;
  updatePatientRecord(id: string, updates: Partial<PatientRecord>): Promise<PatientRecord>;

  // Doctor availability
  createDoctorAvailability(availability: InsertDoctorAvailability): Promise<DoctorAvailability>;
  getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]>;
  updateDoctorAvailability(id: string, updates: Partial<DoctorAvailability>): Promise<DoctorAvailability>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByPatient(patientId: string): Promise<Payment[]>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment>;

  // Disputes
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  getDispute(id: string): Promise<Dispute | undefined>;
  getAllDisputes(): Promise<Dispute[]>;
  updateDispute(id: string, updates: Partial<Dispute>): Promise<Dispute>;

  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private doctorProfiles: Map<string, DoctorProfile>;
  private appointments: Map<string, Appointment>;
  private doctorDocuments: Map<string, DoctorDocument>;
  private patientRecords: Map<string, PatientRecord>;
  private doctorAvailability: Map<string, DoctorAvailability>;
  private payments: Map<string, Payment>;
  private disputes: Map<string, Dispute>;
  public sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.doctorProfiles = new Map();
    this.appointments = new Map();
    this.doctorDocuments = new Map();
    this.patientRecords = new Map();
    this.doctorAvailability = new Map();
    this.payments = new Map();
    this.disputes = new Map();

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Seed with some data
    this.seedData();
  }

  private async seedData() {
    // Create admin user
    const adminUser = await this.createUser({
      username: "admin",
      email: "admin@medconnect.com",
      password: "$2b$10$hashed_password", // This would be hashed in real implementation
      role: "admin",
      firstName: "System",
      lastName: "Administrator",
      isVerified: true,
      isActive: true,
    });

    // Create sample doctors
    const doctor1 = await this.createUser({
      username: "dr.rajesh",
      email: "rajesh@medconnect.com",
      password: "$2b$10$hashed_password",
      role: "doctor",
      firstName: "Rajesh",
      lastName: "Kumar",
      phone: "+919876543210",
      isVerified: true,
      isActive: true,
    });

    await this.createDoctorProfile({
      userId: doctor1.id,
      specialization: "Cardiology",
      experience: 12,
      consultationFee: 800,
      bio: "Experienced cardiologist with specialization in interventional cardiology and heart disease prevention.",
      qualifications: ["MBBS", "MD - Cardiology"],
      hospitalAffiliation: "AIIMS Ranchi",
      licenseNumber: "MH12345",
      isApproved: true,
      rating: 48,
      totalReviews: 10,
    });

    const doctor2 = await this.createUser({
      username: "dr.priya",
      email: "priya@medconnect.com",
      password: "$2b$10$hashed_password",
      role: "doctor",
      firstName: "Priya",
      lastName: "Sharma",
      phone: "+919876543211",
      isVerified: true,
      isActive: true,
    });

    await this.createDoctorProfile({
      userId: doctor2.id,
      specialization: "Dermatology",
      experience: 8,
      consultationFee: 600,
      bio: "Specializes in skin disorders, cosmetic dermatology, and hair loss treatment.",
      qualifications: ["MBBS", "MD - Dermatology"],
      hospitalAffiliation: "Ranchi Institute of Medical Sciences",
      licenseNumber: "JH67890",
      isApproved: true,
      rating: 49,
      totalReviews: 10,
    });

    // Create sample patient
    const patient1 = await this.createUser({
      username: "patient1",
      email: "patient@example.com",
      password: "$2b$10$hashed_password",
      role: "patient",
      firstName: "Aman",
      lastName: "Singh",
      phone: "+919876543212",
      isVerified: true,
      isActive: true,
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  // Doctor profile methods
  async createDoctorProfile(profile: InsertDoctorProfile): Promise<DoctorProfile> {
    const id = randomUUID();
    const doctorProfile: DoctorProfile = {
      ...profile,
      id,
    };
    this.doctorProfiles.set(id, doctorProfile);
    return doctorProfile;
  }

  async getDoctorProfile(userId: string): Promise<DoctorProfile | undefined> {
    return Array.from(this.doctorProfiles.values()).find(profile => profile.userId === userId);
  }

  async getDoctorProfiles(): Promise<DoctorProfile[]> {
    return Array.from(this.doctorProfiles.values());
  }

  async updateDoctorProfile(userId: string, updates: Partial<DoctorProfile>): Promise<DoctorProfile> {
    const profile = Array.from(this.doctorProfiles.values()).find(p => p.userId === userId);
    if (!profile) throw new Error("Doctor profile not found");
    const updatedProfile = { ...profile, ...updates };
    this.doctorProfiles.set(profile.id, updatedProfile);
    return updatedProfile;
  }

  async getDoctorsWithProfiles(): Promise<(User & { profile: DoctorProfile })[]> {
    const doctors = await this.getUsersByRole("doctor");
    const doctorsWithProfiles = [];
    
    for (const doctor of doctors) {
      const profile = await this.getDoctorProfile(doctor.id);
      if (profile) {
        doctorsWithProfiles.push({ ...doctor, profile });
      }
    }
    
    return doctorsWithProfiles;
  }

  // Appointment methods
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const newAppointment: Appointment = {
      ...appointment,
      id,
      createdAt: new Date(),
    };
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(apt => apt.patientId === patientId);
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(apt => apt.doctorId === doctorId);
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const appointment = this.appointments.get(id);
    if (!appointment) throw new Error("Appointment not found");
    const updatedAppointment = { ...appointment, ...updates };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  // Doctor document methods
  async createDoctorDocument(document: InsertDoctorDocument): Promise<DoctorDocument> {
    const id = randomUUID();
    const newDocument: DoctorDocument = {
      ...document,
      id,
      uploadedAt: new Date(),
    };
    this.doctorDocuments.set(id, newDocument);
    return newDocument;
  }

  async getDoctorDocuments(doctorId: string): Promise<DoctorDocument[]> {
    return Array.from(this.doctorDocuments.values()).filter(doc => doc.doctorId === doctorId);
  }

  async updateDoctorDocument(id: string, updates: Partial<DoctorDocument>): Promise<DoctorDocument> {
    const document = this.doctorDocuments.get(id);
    if (!document) throw new Error("Document not found");
    const updatedDocument = { ...document, ...updates };
    this.doctorDocuments.set(id, updatedDocument);
    return updatedDocument;
  }

  async getAllPendingDocuments(): Promise<DoctorDocument[]> {
    return Array.from(this.doctorDocuments.values()).filter(doc => !doc.isVerified);
  }

  // Patient record methods
  async createPatientRecord(record: InsertPatientRecord): Promise<PatientRecord> {
    const id = randomUUID();
    const newRecord: PatientRecord = {
      ...record,
      id,
      uploadedAt: new Date(),
    };
    this.patientRecords.set(id, newRecord);
    return newRecord;
  }

  async getPatientRecords(patientId: string): Promise<PatientRecord[]> {
    return Array.from(this.patientRecords.values()).filter(record => record.patientId === patientId);
  }

  async updatePatientRecord(id: string, updates: Partial<PatientRecord>): Promise<PatientRecord> {
    const record = this.patientRecords.get(id);
    if (!record) throw new Error("Patient record not found");
    const updatedRecord = { ...record, ...updates };
    this.patientRecords.set(id, updatedRecord);
    return updatedRecord;
  }

  // Doctor availability methods
  async createDoctorAvailability(availability: InsertDoctorAvailability): Promise<DoctorAvailability> {
    const id = randomUUID();
    const newAvailability: DoctorAvailability = {
      ...availability,
      id,
    };
    this.doctorAvailability.set(id, newAvailability);
    return newAvailability;
  }

  async getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]> {
    return Array.from(this.doctorAvailability.values()).filter(avail => avail.doctorId === doctorId);
  }

  async updateDoctorAvailability(id: string, updates: Partial<DoctorAvailability>): Promise<DoctorAvailability> {
    const availability = this.doctorAvailability.get(id);
    if (!availability) throw new Error("Availability not found");
    const updatedAvailability = { ...availability, ...updates };
    this.doctorAvailability.set(id, updatedAvailability);
    return updatedAvailability;
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const newPayment: Payment = {
      ...payment,
      id,
      createdAt: new Date(),
    };
    this.payments.set(id, newPayment);
    return newPayment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByPatient(patientId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.patientId === patientId);
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const payment = this.payments.get(id);
    if (!payment) throw new Error("Payment not found");
    const updatedPayment = { ...payment, ...updates };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  // Dispute methods
  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    const id = randomUUID();
    const newDispute: Dispute = {
      ...dispute,
      id,
      createdAt: new Date(),
      resolvedAt: null,
    };
    this.disputes.set(id, newDispute);
    return newDispute;
  }

  async getDispute(id: string): Promise<Dispute | undefined> {
    return this.disputes.get(id);
  }

  async getAllDisputes(): Promise<Dispute[]> {
    return Array.from(this.disputes.values());
  }

  async updateDispute(id: string, updates: Partial<Dispute>): Promise<Dispute> {
    const dispute = this.disputes.get(id);
    if (!dispute) throw new Error("Dispute not found");
    const updatedDispute = { ...dispute, ...updates };
    if (updates.status === "resolved" && !dispute.resolvedAt) {
      updatedDispute.resolvedAt = new Date();
    }
    this.disputes.set(id, updatedDispute);
    return updatedDispute;
  }
}

export const storage = new MemStorage();
