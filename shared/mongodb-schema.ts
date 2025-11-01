import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

// ==========================================
// USER SCHEMA
// ==========================================
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
  profilePicture?: string;
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
  profilePicture: { type: String },
});

// ==========================================
// DOCTOR PROFILE SCHEMA
// ==========================================
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
  profilePicture?: string;
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
  profilePicture: { type: String },
});

// ==========================================
// APPOINTMENT SCHEMA (UPDATED)
// ==========================================
export interface IAppointment extends Document {
  _id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  duration: number;
  type: 'video' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'awaiting_payment' | 'confirmed';
  consultationFee: number;
  notes?: string;
  prescription?: string;
  prescriptionFile?: string;
  createdAt: Date;
}

const appointmentSchema = new Schema<IAppointment>({
  patientId: { type: String, required: true, ref: 'User' },
  doctorId: { type: String, required: true, ref: 'User' },
  appointmentDate: { type: Date, required: true },
  duration: { type: Number, default: 30 },
  type: { type: String, required: true, enum: ['video', 'in-person'] },
  status: { type: String, default: 'scheduled', enum: ['scheduled', 'completed', 'cancelled', 'no-show', 'awaiting_payment', 'confirmed'] },
  consultationFee: { type: Number, required: true },
  notes: { type: String },
  prescription: { type: String },
  prescriptionFile: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// ==========================================
// DOCTOR DOCUMENT SCHEMA
// ==========================================
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

// ==========================================
// PATIENT RECORD SCHEMA
// ==========================================
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

// ==========================================
// DOCTOR AVAILABILITY SCHEMA
// ==========================================
export interface IDoctorAvailability extends Document {
  _id: string;
  doctorId: string;
  dayOfWeek: number;
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

// ==========================================
// PAYMENT SCHEMA
// ==========================================
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

// ==========================================
// NOTIFICATION SCHEMA (NEW)
// ==========================================
export interface INotification extends Document {
  _id: string;
  recipientId: string;
  type: 'payment_pending' | 'appointment_confirmed' | 'appointment_scheduled' | 'appointment_cancelled';
  title: string;
  message: string;
  appointmentId?: string;
  appointmentDate?: Date;
  consultationFee?: number;
  doctorId?: string;
  notificationChannels: ('email' | 'inapp')[];
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipientId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['payment_pending', 'appointment_confirmed', 'appointment_scheduled', 'appointment_cancelled'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  appointmentId: { type: String },
  appointmentDate: { type: Date },
  consultationFee: { type: Number },
  doctorId: { type: String },
  notificationChannels: {
    type: [String],
    enum: ['email', 'inapp'],
    default: ['email', 'inapp']
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
});

notificationSchema.index({ recipientId: 1, createdAt: -1 });

// ==========================================
// DISPUTE SCHEMA
// ==========================================
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

// ==========================================
// MODELS
// ==========================================
export const User = model<IUser>('User', userSchema);
export const DoctorProfile = model<IDoctorProfile>('DoctorProfile', doctorProfileSchema);
export const Appointment = model<IAppointment>('Appointment', appointmentSchema);
export const DoctorDocument = model<IDoctorDocument>('DoctorDocument', doctorDocumentSchema);
export const PatientRecord = model<IPatientRecord>('PatientRecord', patientRecordSchema);
export const DoctorAvailability = model<IDoctorAvailability>('DoctorAvailability', doctorAvailabilitySchema);
export const Payment = model<IPayment>('Payment', paymentSchema);
export const Notification = model<INotification>('Notification', notificationSchema);
export const Dispute = model<IDispute>('Dispute', disputeSchema);

// ==========================================
// TYPE EXPORTS
// ==========================================
export type UserType = IUser;
export type DoctorProfileType = IDoctorProfile;
export type AppointmentType = IAppointment;
export type DoctorDocumentType = IDoctorDocument;
export type PatientRecordType = IPatientRecord;
export type DoctorAvailabilityType = IDoctorAvailability;
export type PaymentType = IPayment;
export type NotificationType = INotification;
export type DisputeType = IDispute;

// ==========================================
// INSERT TYPES (Plain Objects)
// ==========================================
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
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'awaiting_payment' | 'confirmed';
  consultationFee: number;
  notes?: string;
  prescription?: string;
  prescriptionFile?: string;
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

export type InsertNotification = {
  recipientId: string;
  type: 'payment_pending' | 'appointment_confirmed' | 'appointment_scheduled' | 'appointment_cancelled';
  title: string;
  message: string;
  appointmentId?: string;
  appointmentDate?: Date;
  consultationFee?: number;
  doctorId?: string;
  notificationChannels?: ('email' | 'inapp')[];
  read?: boolean;
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

// ==========================================
// VALIDATION SCHEMAS (ZOD)
// ==========================================

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
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show', 'awaiting_payment', 'confirmed']).default('scheduled'),
  consultationFee: z.number().min(0),
  notes: z.string().optional(),
  prescription: z.string().optional(),
  prescriptionFile: z.string().optional(),
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

export const insertNotificationSchema = z.object({
  recipientId: z.string(),
  type: z.enum(['payment_pending', 'appointment_confirmed', 'appointment_scheduled', 'appointment_cancelled']),
  title: z.string(),
  message: z.string(),
  appointmentId: z.string().optional(),
  appointmentDate: z.date().optional(),
  consultationFee: z.number().optional(),
  doctorId: z.string().optional(),
  notificationChannels: z.array(z.enum(['email', 'inapp'])).default(['email', 'inapp']),
  read: z.boolean().default(false),
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