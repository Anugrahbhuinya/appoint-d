import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertDoctorProfileSchema, insertAppointmentSchema, insertPaymentSchema, insertDoctorDocumentSchema, insertPatientRecordSchema, insertDoctorAvailabilitySchema, insertDisputeSchema } from "@shared/schema";

// Stripe setup
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY not found. Payment functionality will be limited.');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, ) : null;

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
        userId: req.user!.id,
      });

      const profile = await storage.createDoctorProfile(validatedData);
      res.status(201).json(profile);
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

      const profile = await storage.getDoctorProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }

      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

      const updates = req.body;
      delete updates.userId; // Prevent userId changes
      delete updates.id; // Prevent id changes

      const profile = await storage.updateDoctorProfile(req.user!.id, updates);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Doctor Search Routes
  app.get("/api/doctors", async (req, res) => {
    try {
      const { specialization, location, minFee, maxFee } = req.query;
      let doctors = await storage.getDoctorsWithProfiles();

      // Filter by specialization
      if (specialization && specialization !== "all") {
        doctors = doctors.filter(doctor => 
          doctor.profile.specialization.toLowerCase().includes((specialization as string).toLowerCase())
        );
      }

      // Filter by consultation fee
      if (minFee) {
        doctors = doctors.filter(doctor => doctor.profile.consultationFee >= parseInt(minFee as string));
      }
      if (maxFee) {
        doctors = doctors.filter(doctor => doctor.profile.consultationFee <= parseInt(maxFee as string));
      }

      // Only return approved doctors
      doctors = doctors.filter(doctor => doctor.profile.isApproved && doctor.isActive);

      res.json(doctors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/doctors/:id", async (req, res) => {
    try {
      const doctor = await storage.getUser(req.params.id);
      if (!doctor || doctor.role !== "doctor") {
        return res.status(404).json({ message: "Doctor not found" });
      }

      const profile = await storage.getDoctorProfile(doctor.id);
      if (!profile) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }

      res.json({ ...doctor, profile });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Appointment Routes
  app.post("/api/appointments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertAppointmentSchema.parse({
        ...req.body,
        patientId: req.user!.role === "patient" ? req.user!.id : req.body.patientId,
      });

      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
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
        appointments = await storage.getAppointmentsByPatient(req.user!.id);
      } else if (req.user!.role === "doctor") {
        appointments = await storage.getAppointmentsByDoctor(req.user!.id);
      } else if (req.user!.role === "admin") {
        appointments = await storage.getAllAppointments();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/appointments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Check permissions
      if (req.user!.role === "patient" && appointment.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (req.user!.role === "doctor" && appointment.doctorId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedAppointment = await storage.updateAppointment(req.params.id, req.body);
      res.json(updatedAppointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Payment Routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Payment processing not configured" });
      }

      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { amount, appointmentId } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "inr",
        metadata: {
          userId: req.user!.id,
          appointmentId: appointmentId,
        },
      });

      // Create payment record
      await storage.createPayment({
        appointmentId,
        patientId: req.user!.id,
        doctorId: req.body.doctorId,
        amount,
        stripePaymentIntentId: paymentIntent.id,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post("/api/payments/:id/confirm", async (req, res) => {
    try {
      const payment = await storage.updatePayment(req.params.id, { status: "completed" });
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Document Upload Routes
  app.post("/api/doctor/documents", upload.single('document'), async (req, res) => {
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
        doctorId: req.user!.id,
        documentType: req.body.documentType,
        fileName: req.file.originalname,
        filePath: req.file.path,
      });

      const document = await storage.createDoctorDocument(documentData);
      res.status(201).json(document);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/doctor/documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const doctorId = req.user!.role === "doctor" ? req.user!.id : req.query.doctorId as string;
      if (!doctorId) {
        return res.status(400).json({ message: "Doctor ID required" });
      }

      const documents = await storage.getDoctorDocuments(doctorId);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Patient Records Routes
  app.post("/api/patient/records", upload.single('record'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const recordData = insertPatientRecordSchema.parse({
        patientId: req.user!.role === "patient" ? req.user!.id : req.body.patientId,
        recordType: req.body.recordType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        doctorId: req.body.doctorId,
        appointmentId: req.body.appointmentId,
      });

      const record = await storage.createPatientRecord(recordData);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/patient/records", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const patientId = req.user!.role === "patient" ? req.user!.id : req.query.patientId as string;
      if (!patientId) {
        return res.status(400).json({ message: "Patient ID required" });
      }

      const records = await storage.getPatientRecords(patientId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
        doctorId: req.user!.id,
      });

      const availability = await storage.createDoctorAvailability(availabilityData);
      res.status(201).json(availability);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/doctor/availability", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const doctorId = req.user!.role === "doctor" ? req.user!.id : req.query.doctorId as string;
      if (!doctorId) {
        return res.status(400).json({ message: "Doctor ID required" });
      }

      const availability = await storage.getDoctorAvailability(doctorId);
      res.json(availability);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

      const pendingDoctors = await storage.getUsersByRole("doctor");
      const pendingProfiles = [];

      for (const doctor of pendingDoctors) {
        const profile = await storage.getDoctorProfile(doctor.id);
        if (profile && !profile.isApproved) {
          pendingProfiles.push({ ...doctor, profile });
        }
      }

      res.json(pendingProfiles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  // Dispute Routes
  app.post("/api/disputes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const disputeData = insertDisputeSchema.parse(req.body);
      const dispute = await storage.createDispute(disputeData);
      res.status(201).json(dispute);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/disputes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const disputes = await storage.getAllDisputes();
      res.json(disputes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

      const updates = {
        ...req.body,
        resolvedBy: req.user!.id,
      };

      const dispute = await storage.updateDispute(req.params.id, updates);
      res.json(dispute);
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
      };

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
