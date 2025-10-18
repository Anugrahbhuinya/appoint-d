import { Schema, model, Document } from 'mongoose';

// User Schema
export interface IUser extends Document {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
  firstName?: string;
  lastName?: string;
  phone?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  profilePicture?: string; // URL or path to profile picture
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'patient', enum: ['patient', 'doctor', 'admin'] },
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  profilePicture: { type: String }, // URL or path to profile picture
});

// Doctor Profile Schema
export interface IDoctorProfile extends Document {
  _id: string;
  userId: string;
  specialization: string;
  experience: number;
  consultationFee: number;
  bio?: string;
  qualifications: string[];
  hospitalAffiliation?: string;
  licenseNumber?: string;
  isApproved: boolean;
  rating: number;
  totalReviews: number;
  profilePicture?: string; // URL or path to profile picture
}

const doctorProfileSchema = new Schema<IDoctorProfile>({
  userId: { type: String, required: true, ref: 'User' },
  specialization: { type: String, required: true },
  experience: { type: Number, required: true },
  consultationFee: { type: Number, required: true },
  bio: { type: String },
  qualifications: [{ type: String }],
  hospitalAffiliation: { type: String },
  licenseNumber: { type: String },
  isApproved: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  profilePicture: { type: String }, // URL or path to profile picture
});

// Appointment Schema
export interface IAppointment extends Document {
  _id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  duration: number;
  type: 'video' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  consultationFee: number;
  notes?: string;
  prescription?: string;
  createdAt: Date;
}

const appointmentSchema = new Schema<IAppointment>({
  patientId: { type: String, required: true, ref: 'User' },
  doctorId: { type: String, required: true, ref: 'User' },
  appointmentDate: { type: Date, required: true },
  duration: { type: Number, default: 30 },
  type: { type: String, required: true, enum: ['video', 'in-person'] },
  status: { type: String, default: 'scheduled', enum: ['scheduled', 'completed', 'cancelled', 'no-show'] },
  consultationFee: { type: Number, required: true },
  notes: { type: String },
  prescription: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Doctor Document Schema
export interface IDoctorDocument extends Document {
  _id: string;
  doctorId: string;
  documentType: 'license' | 'certificate' | 'experience';
  fileName: string;
  filePath: string;
  isVerified: boolean;
  uploadedAt: Date;
}

const doctorDocumentSchema = new Schema<IDoctorDocument>({
  doctorId: { type: String, required: true, ref: 'User' },
  documentType: { type: String, required: true, enum: ['license', 'certificate', 'experience'] },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now }
});

// Patient Record Schema
export interface IPatientRecord extends Document {
  _id: string;
  patientId: string;
  recordType: 'lab_report' | 'prescription' | 'x_ray' | 'other';
  fileName: string;
  filePath: string;
  doctorId?: string;
  appointmentId?: string;
  uploadedAt: Date;
}

const patientRecordSchema = new Schema<IPatientRecord>({
  patientId: { type: String, required: true, ref: 'User' },
  recordType: { type: String, required: true, enum: ['lab_report', 'prescription', 'x_ray', 'other'] },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  doctorId: { type: String, ref: 'User' },
  appointmentId: { type: String, ref: 'Appointment' },
  uploadedAt: { type: Date, default: Date.now }
});

// Doctor Availability Schema
export interface IDoctorAvailability extends Document {
  _id: string;
  doctorId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const doctorAvailabilitySchema = new Schema<IDoctorAvailability>({
  doctorId: { type: String, required: true, ref: 'User' },
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isAvailable: { type: Boolean, default: true }
});

// Payment Schema
export interface IPayment extends Document {
  _id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  appointmentId: { type: String, required: true, ref: 'Appointment' },
  patientId: { type: String, required: true, ref: 'User' },
  doctorId: { type: String, required: true, ref: 'User' },
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'completed', 'failed', 'refunded'] },
  paymentMethod: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Dispute Schema
export interface IDispute extends Document {
  _id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  reason: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution?: string;
  resolvedBy?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const disputeSchema = new Schema<IDispute>({
  appointmentId: { type: String, required: true, ref: 'Appointment' },
  patientId: { type: String, required: true, ref: 'User' },
  doctorId: { type: String, required: true, ref: 'User' },
  reason: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'open', enum: ['open', 'in_progress', 'resolved', 'closed'] },
  resolution: { type: String },
  resolvedBy: { type: String, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

// Create models
export const User = model<IUser>('User', userSchema);
export const DoctorProfile = model<IDoctorProfile>('DoctorProfile', doctorProfileSchema);
export const Appointment = model<IAppointment>('Appointment', appointmentSchema);
export const DoctorDocument = model<IDoctorDocument>('DoctorDocument', doctorDocumentSchema);
export const PatientRecord = model<IPatientRecord>('PatientRecord', patientRecordSchema);
export const DoctorAvailability = model<IDoctorAvailability>('DoctorAvailability', doctorAvailabilitySchema);
export const Payment = model<IPayment>('Payment', paymentSchema);
export const Dispute = model<IDispute>('Dispute', disputeSchema);

// Type definitions for compatibility with existing code
export type User = IUser;
export type DoctorProfile = IDoctorProfile;
export type Appointment = IAppointment;
export type DoctorDocument = IDoctorDocument;
export type PatientRecord = IPatientRecord;
export type DoctorAvailability = IDoctorAvailability;
export type Payment = IPayment;
export type Dispute = IDispute;

// Insert types (for compatibility) - plain objects without Mongoose methods
export type InsertUser = {
  username: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
  firstName?: string;
  lastName?: string;
  phone?: string;
  isVerified: boolean;
  isActive: boolean;
};

export type InsertDoctorProfile = {
  userId: string;
  specialization: string;
  experience: number;
  consultationFee: number;
  bio?: string;
  qualifications: string[];
  hospitalAffiliation?: string;
  licenseNumber?: string;
  isApproved: boolean;
  rating: number;
  totalReviews: number;
};

export type InsertAppointment = {
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  duration: number;
  type: 'video' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  consultationFee: number;
  notes?: string;
  prescription?: string;
};

export type InsertDoctorDocument = {
  doctorId: string;
  documentType: 'license' | 'certificate' | 'experience';
  fileName: string;
  filePath: string;
  isVerified: boolean;
};

export type InsertPatientRecord = {
  patientId: string;
  recordType: 'lab_report' | 'prescription' | 'x_ray' | 'other';
  fileName: string;
  filePath: string;
  doctorId?: string;
  appointmentId?: string;
};

export type InsertDoctorAvailability = {
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

export type InsertPayment = {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
};

export type InsertDispute = {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  reason: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution?: string;
  resolvedBy?: string;
};

// Validation schemas using Zod (for compatibility with existing code)
import { z } from 'zod';

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  role: z.enum(['patient', 'doctor', 'admin']).default('patient'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const insertDoctorProfileSchema = z.object({
  userId: z.string(),
  specialization: z.string().min(1),
  experience: z.number().min(0),
  consultationFee: z.number().min(0),
  bio: z.string().optional(),
  qualifications: z.array(z.string()),
  hospitalAffiliation: z.string().optional(),
  licenseNumber: z.string().optional(),
  isApproved: z.boolean().default(false),
  rating: z.number().default(0),
  totalReviews: z.number().default(0),
});

export const insertAppointmentSchema = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  appointmentDate: z.date(),
  duration: z.number().default(30),
  type: z.enum(['video', 'in-person']),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show']).default('scheduled'),
  consultationFee: z.number().min(0),
  notes: z.string().optional(),
  prescription: z.string().optional(),
});

export const insertDoctorDocumentSchema = z.object({
  doctorId: z.string(),
  documentType: z.enum(['license', 'certificate', 'experience']),
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  isVerified: z.boolean().default(false),
});

export const insertPatientRecordSchema = z.object({
  patientId: z.string(),
  recordType: z.enum(['lab_report', 'prescription', 'x_ray', 'other']),
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  doctorId: z.string().optional(),
  appointmentId: z.string().optional(),
});

export const insertDoctorAvailabilitySchema = z.object({
  doctorId: z.string(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  isAvailable: z.boolean().default(true),
});

export const insertPaymentSchema = z.object({
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  amount: z.number().min(0),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending'),
  paymentMethod: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
});

export const insertDisputeSchema = z.object({
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  reason: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
  resolution: z.string().optional(),
  resolvedBy: z.string().optional(),
});
