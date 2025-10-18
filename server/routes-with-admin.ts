import type { Express } from "express";
import { createServer, type Server } from "http";
import Razorpay from "razorpay";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertDoctorProfileSchema, insertAppointmentSchema, insertPaymentSchema, insertDoctorDocumentSchema, insertPatientRecordSchema, insertDoctorAvailabilitySchema, insertDisputeSchema } from "@shared/mongodb-schema";

// Razorpay setup
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('Warning: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not found. Payment functionality will be limited.');
}

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null;

// File upload setup
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Doctor Profile Routes
  app.post("/api/doctor/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (req.user!.role !== "doctor") {
        return res.status(403).json({ message: "Doctor access required" });
      }

      const validatedData = insertDoctorProfileSchema.parse({
        ...req.body,
        userId: req.user!._id.toString(),
      });

      const profile = await storage.createDoctorProfile(validatedData);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/doctor/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (req.user!.role !== "doctor") {
        return res.status(403).json({ message: "Doctor access required" });
      }

      const profile = await storage.getDoctorProfile(req.user!._id.toString());
      res.json(profile);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  app.put("/api/doctor/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (req.user!.role !== "doctor") {
        return res.status(403).json({ message: "Doctor access required" });
      }

      const profile = await storage.updateDoctorProfile(req.user!._id.toString(), req.body);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Doctor Availability Routes
  app.post("/api/doctor/availability", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.user!.role !== "doctor") {
        return res.status(403).json({ message: "Doctor access required" });
      }
      const availabilityData = insertDoctorAvailabilitySchema.parse({
        ...req.body,
        doctorId: req.user!._id.toString(),
      });
      const availability = await storage.createDoctorAvailability(availabilityData);
      res.json(availability);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/doctor/availability", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.user!.role !== "doctor") {
        return res.status(403).json({ message: "Doctor access required" });
      }
      const availability = await storage.getDoctorAvailability(req.user!._id.toString());
      res.json(availability);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/doctor/availability/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.user!.role !== "doctor") {
        return res.status(403).json({ message: "Doctor access required" });
      }
      const availability = await storage.updateDoctorAvailability(req.params.id, req.body);
      res.json(availability);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/doctor/availability/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.user!.role !== "doctor") {
        return res.status(403).json({ message: "Doctor access required" });
      }
      await storage.deleteDoctorAvailability(req.params.id);
      res.json({ message: "Availability deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Appointments Routes
  app.post("/api/appointments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertAppointmentSchema.parse({
        ...req.body,
        patientId: req.user!.role === "patient" ? req.user!._id.toString() : req.body.patientId,
      });

      const appointment = await storage.createAppointment(validatedData);
      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/appointments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let appointments;
      if (req.user!.role === "patient") {
        appointments = await storage.getAppointmentsByPatient(req.user!._id.toString());
      } else if (req.user!.role === "doctor") {
        appointments = await storage.getAppointmentsByDoctor(req.user!._id.toString());
      } else if (req.user!.role === "admin") {
        appointments = await storage.getAllAppointments();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(appointments);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/appointments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const appointment = await storage.updateAppointment(req.params.id, req.body);
      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Payment Routes
  app.post("/api/create-order", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { appointmentId, doctorId, amount } = req.body;

      if (!razorpay) {
        return res.status(500).json({ message: "Payment service not configured" });
      }

      const order = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `appointment_${appointmentId}`,
      });

      await storage.createPayment({
        appointmentId,
        patientId: req.user!._id.toString(),
        doctorId: doctorId,
        amount,
        status: "pending",
        razorpayOrderId: order.id,
      });

      res.json({ order });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/verify-payment", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { orderId, paymentId, signature } = req.body;

      if (!razorpay) {
        return res.status(500).json({ message: "Payment service not configured" });
      }

      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (expectedSignature === signature) {
        await storage.updatePaymentStatus(orderId, "completed", paymentId);
        res.json({ success: true });
      } else {
        res.status(400).json({ message: "Invalid payment signature" });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Document Upload Routes
  app.post("/api/doctor/documents", upload.single("document"), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.user!.role !== "doctor") {
        return res.status(403).json({ message: "Doctor access required" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const documentData = insertDoctorDocumentSchema.parse({
        doctorId: req.user!._id.toString(),
        documentType: req.body.documentType,
        fileName: req.file.originalname,
        filePath: req.file.path,
      });

      const document = await storage.createDoctorDocument(documentData);
      res.json(document);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/doctor/documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.user!.role !== "doctor") {
        return res.status(403).json({ message: "Doctor access required" });
      }

      const documents = await storage.getDoctorDocuments(req.user!._id.toString());
      res.json(documents);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Patient Records Routes
  app.post("/api/patient/records", upload.single("file"), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const recordData = insertPatientRecordSchema.parse({
        patientId: req.user!.role === "patient" ? req.user!._id.toString() : req.body.patientId,
        recordType: req.body.recordType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        doctorId: req.body.doctorId,
        appointmentId: req.body.appointmentId,
      });

      const record = await storage.createPatientRecord(recordData);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/patient/records", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let records;
      if (req.user!.role === "patient") {
        records = await storage.getPatientRecords(req.user!._id.toString());
      } else if (req.user!.role === "doctor") {
        records = await storage.getPatientRecordsByDoctor(req.user!._id.toString());
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(records);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Doctors List Route
  app.get("/api/doctors", async (req, res) => {
    try {
      const doctors = await storage.getDoctorsWithProfiles();
      res.json(doctors);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Disputes Routes
  app.post("/api/disputes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const disputeData = insertDisputeSchema.parse({
        ...req.body,
        reportedBy: req.user!._id.toString(),
      });

      const dispute = await storage.createDispute(disputeData);
      res.json(dispute);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/disputes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let disputes;
      if (req.user!.role === "admin") {
        disputes = await storage.getAllDisputes();
      } else {
        disputes = await storage.getDisputesByUser(req.user!._id.toString());
      }

      res.json(disputes);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/disputes/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const dispute = await storage.updateDispute(req.params.id, req.body);
      res.json(dispute);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin Routes
  app.get("/api/admin/pending-verifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const pendingDoctors = await storage.getDoctorsWithProfiles();
      const filtered = pendingDoctors.filter(doctor => !doctor.profile?.isApproved);
      res.json(filtered);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/verify-doctor/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { approved } = req.body;
      const profile = await storage.updateDoctorProfile(req.params.id, { isApproved: approved });
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // NEW ADMIN ROUTES FOR REAL DATA
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/appointments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/verify-user/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { verified } = req.body;
      const user = await storage.updateUserVerification(req.params.id, verified);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/verify-document/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { verified, reason } = req.body;
      const document = await storage.updateDocumentVerification(req.params.id, verified, reason);
      res.json(document);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Analytics Routes
  app.get("/api/admin/analytics", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const totalUsers = await storage.getAllUsers();
      const totalDoctors = await storage.getUsersByRole("doctor");
      const totalPatients = await storage.getUsersByRole("patient");
      const totalAppointments = await storage.getAllAppointments();
      const allPayments = await storage.getPaymentsByPatient(""); // Get all payments
      
      const analytics = {
        totalUsers: totalUsers.length,
        totalDoctors: totalDoctors.length,
        totalPatients: totalPatients.length,
        totalAppointments: totalAppointments.length,
        totalRevenue: allPayments.reduce((sum, payment) => sum + (payment.status === "completed" ? payment.amount : 0), 0),
        monthlyAppointments: totalAppointments.filter(apt => {
          const aptDate = new Date(apt.createdAt || new Date());
          const now = new Date();
          return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
        }).length,
        pendingVerifications: totalDoctors.filter(doctor => !doctor.profile?.isApproved).length,
      };

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
