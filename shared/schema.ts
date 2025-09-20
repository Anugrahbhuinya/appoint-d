import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("patient"), // patient, doctor, admin
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const doctorProfiles = pgTable("doctor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  specialization: text("specialization").notNull(),
  experience: integer("experience").notNull(),
  consultationFee: integer("consultation_fee").notNull(),
  bio: text("bio"),
  qualifications: text("qualifications").array(),
  hospitalAffiliation: text("hospital_affiliation"),
  licenseNumber: text("license_number"),
  isApproved: boolean("is_approved").default(false),
  rating: integer("rating").default(0),
  totalReviews: integer("total_reviews").default(0),
});

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => users.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").default(30), // minutes
  type: text("type").notNull(), // video, in-person
  status: text("status").default("scheduled"), // scheduled, completed, cancelled, no-show
  consultationFee: integer("consultation_fee").notNull(),
  notes: text("notes"),
  prescription: text("prescription"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const doctorDocuments = pgTable("doctor_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  documentType: text("document_type").notNull(), // license, certificate, experience
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  isVerified: boolean("is_verified").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const patientRecords = pgTable("patient_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => users.id).notNull(),
  recordType: text("record_type").notNull(), // lab_report, prescription, x_ray, etc.
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  doctorId: varchar("doctor_id").references(() => users.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const doctorAvailability = pgTable("doctor_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isAvailable: boolean("is_available").default(true),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").references(() => appointments.id).notNull(),
  patientId: varchar("patient_id").references(() => users.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  status: text("status").default("pending"), // pending, completed, failed, refunded
  paymentMethod: text("payment_method"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").references(() => appointments.id).notNull(),
  patientId: varchar("patient_id").references(() => users.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  status: text("status").default("open"), // open, in_progress, resolved, closed
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertDoctorProfileSchema = createInsertSchema(doctorProfiles).omit({
  id: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertDoctorDocumentSchema = createInsertSchema(doctorDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertPatientRecordSchema = createInsertSchema(patientRecords).omit({
  id: true,
  uploadedAt: true,
});

export const insertDoctorAvailabilitySchema = createInsertSchema(doctorAvailability).omit({
  id: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDoctorProfile = z.infer<typeof insertDoctorProfileSchema>;
export type DoctorProfile = typeof doctorProfiles.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertDoctorDocument = z.infer<typeof insertDoctorDocumentSchema>;
export type DoctorDocument = typeof doctorDocuments.$inferSelect;
export type InsertPatientRecord = z.infer<typeof insertPatientRecordSchema>;
export type PatientRecord = typeof patientRecords.$inferSelect;
export type InsertDoctorAvailability = z.infer<typeof insertDoctorAvailabilitySchema>;
export type DoctorAvailability = typeof doctorAvailability.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;
