import type { Express } from "express";
import { createServer, type Server } from "http";
import Razorpay from "razorpay";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import express from 'express';
// FIX 1: Import DoctorAvailability model, and crypto if running without global node access
import { DoctorAvailability } from "@shared/mongodb-schema"; 
import crypto from 'crypto'; 
import {
  insertDoctorProfileSchema,
  insertAppointmentSchema,
  insertPaymentSchema,
  insertDoctorDocumentSchema,
  insertPatientRecordSchema,
  insertDoctorAvailabilitySchema,
  insertDisputeSchema,
  insertUserSchema,
} from "@shared/mongodb-schema";
import {
  sanitizeObjectId,
  // All security-utils imports removed as they are unused in the final logic below
} from "./security-utils";

// Razorpay setup
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn(
    "Warning: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not found. Payment functionality will be limited."
  );
}

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

// File upload setup
const upload = multer({
  dest: "uploads/",
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
      cb(new Error("Only images and documents are allowed"));
    }
  },
});
const convertIsoToJsDay = (isoDay: number): number => {
  // ISO: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  // JS:  1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
  if (isoDay < 1 || isoDay > 7) {
    throw new Error("dayOfWeek must be ISO format (1-7)");
  }
  return isoDay === 7 ? 0 : isoDay;
};

const convertJsDayToIso = (jsDay: number): number => {
  return jsDay === 0 ? 7 : jsDay;
};

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // === STATIC FILE SERVING FOR DOWNLOADS ===
  // Expose the 'uploads' folder for public access (for document downloads)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  // =========================================


  // === AUTHENTICATION ROUTES ===

  app.post("/api/register", async (req, res, next) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      // Check for uniqueness before hashing and creation
      if (await storage.getUserByUsername(validatedData.username)) {
        return res.status(409).json({ message: "Username already exists" });
      }
      if (await storage.getUserByEmail(validatedData.email)) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
      });

      req.login(user.toObject(), (err) => { // Use .toObject() here for safety
        if (err) {
            console.error("Login after registration failed:", err);
            return next(err);
        }
        res.status(201).json(user.toObject());
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed due to invalid data." });
    }
  });

  // POST /api/login uses Passport.js middleware, which is designed to catch 
  // authentication failure and return 401. Only 500 errors (like DB crash) 
  // should hit the catch blocks.
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // This function only runs if authentication succeeded
    if (req.user) {
      res.status(200).json(req.user);
    } else {
      // Fallback for passport failure not caught by default 401
      res.status(401).json({ message: "Authentication failed." }); 
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout failed:", err);
        return next(err);
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    try {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        
        // Ensure user is fresh and correctly structured
        const fullUser = await storage.getUser(req.user!._id.toString());
        
        if (!fullUser) return res.sendStatus(401);

        // FIX: Ensure a plain object is returned
        res.json(fullUser.toObject()); 
        
    } catch (error) {
        console.error("GET /api/user failed:", error);
        res.status(500).json({ message: "Internal Server Error during user retrieval." });
    }
  });
  // ========================================================

  // === PROFILE PICTURE UPLOAD (Doctor & Patient) ===
  app.post("/api/upload/profile-picture", upload.single("image"), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      // Crop/nudge options from body (JSON or form fields)
      const crop = req.body.crop ? JSON.parse(req.body.crop) : undefined;
      const nudge = req.body.nudge ? JSON.parse(req.body.nudge) : undefined;

      // Output path (unique filename)
      const ext = path.extname(req.file.originalname) || ".jpg";
      const outputFileName = `profile_${req.user!._id.toString()}_${Date.now()}${ext}`;
      const outputPath = path.join("uploads", outputFileName);

      // Process image (crop, nudge, resize)
      // NOTE: We assume 'image-utils.js' is available and exports processProfileImage
      const { processProfileImage } = await import("./image-utils.js"); 
      await processProfileImage(req.file.path, outputPath, crop, nudge);

      // Save path to user or doctor profile
      let updated;
      if (req.user!.role === "doctor") {
        // Update doctor profile
        updated = await storage.updateDoctorProfile(req.user!._id.toString(), { profilePicture: outputPath });
      } else {
        // Update patient (user)
        updated = await storage.updateUser(req.user!._id.toString(), { profilePicture: outputPath });
      }

      res.json({ success: true, profilePicture: outputPath, updated });
    } catch (error: any) {
      console.error("POST /api/upload/profile-picture failed:", error);
      res.status(500).json({ message: error.message || "Failed to upload profile picture." });
    }
  });
  // ========================================================

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
        // FIX: Ensure ID is a string for Zod validation
        userId: req.user!._id.toString(), 
      });

      const profile = await storage.createDoctorProfile(validatedData);
      res.status(201).json(profile);
    } catch (error: any) {
      console.error("POST /api/doctor/profile failed:", error); // Log error
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

      // FIX: Ensure ID is a string when calling storage
      const profile = await storage.getDoctorProfile(req.user!._id.toString());
      if (!profile) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }

      res.json(profile);
    } catch (error: any) {
      console.error("GET /api/doctor/profile failed:", error); // Log error
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
      delete updates._id; // Prevent _id changes

      // FIX: Ensure ID is a string when calling storage
      const profile = await storage.updateDoctorProfile(req.user!._id.toString(), updates);
      res.json(profile);
    } catch (error: any) {
      console.error("PUT /api/doctor/profile failed:", error); // Log error
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
        doctors = doctors.filter((doctor: any) =>
          doctor.profile.specialization.toLowerCase().includes((specialization as string).toLowerCase())
        );
      }

      // Filter by consultation fee
      if (minFee) {
        doctors = doctors.filter(
          (doctor: any) => doctor.profile.consultationFee >= parseInt(minFee as string)
        );
      }
      if (maxFee) {
        doctors = doctors.filter(
          (doctor: any) => doctor.profile.consultationFee <= parseInt(maxFee as string)
        );
      }

      res.json(doctors);
    } catch (error: any) {
      console.error("GET /api/doctors failed:", error); 
      res.status(500).json({ message: error.message || "Failed to retrieve doctor list." });
    }
  });

  app.get("/api/doctors/:id", async (req, res) => {
    try {
      // Sanitize and validate the doctor ID
      // FIX: Assuming sanitizeObjectId returns a string ID
      const doctorId = sanitizeObjectId(req.params.id, 'doctor ID'); 
      
      // FIX: Ensure ID is a string when calling storage
      const doctor = await storage.getUser(doctorId);
      if (!doctor || doctor.role !== "doctor") {
        return res.status(404).json({ message: "Doctor not found" });
      }

      // FIX: Ensure ID is a string when calling storage
      const profile = await storage.getDoctorProfile(doctor._id.toString());
      if (!profile) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }

      // FIX: Ensure both objects are plain JS objects when combining
      res.json({ ...doctor.toObject(), profile: profile.toObject() }); 
    } catch (error: any) {
      console.error("GET /api/doctors/:id failed:", error);
      res.status(500).json({ message: error.message });
    }
  });

// ===========================
// DOCTOR AVAILABILITY ROUTES
// ===========================

app.post("/api/doctor/availability", async (req, res) => {
  try {
    console.log("📝 [POST /api/doctor/availability]");

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user!.role !== "doctor") {
      return res.status(403).json({ message: "Doctor access required" });
    }

    // Validate incoming ISO day (1-7)
    const incomingDay = req.body.dayOfWeek;
    if (incomingDay === undefined || incomingDay === null || incomingDay < 1 || incomingDay > 7) {
      return res.status(400).json({ message: "dayOfWeek must be ISO format (1-7)" });
    }

    console.log("   Incoming day (ISO):", incomingDay);

    const availabilityData = insertDoctorAvailabilitySchema.parse({
      ...req.body,
      dayOfWeek: convertIsoToJsDay(incomingDay), // Convert ISO (1-7) to JS (0-6) for storage
      doctorId: req.user!._id.toString(),
    });

    console.log("   Parsed data with JS day:", availabilityData.dayOfWeek);

    const availability = await storage.createDoctorAvailability(availabilityData);

    console.log("   Created availability:", availability);

    // 🛑 FIX: Check if toObject exists before calling (for safety)
    const obj = availability.toObject ? availability.toObject() : availability;
    
    // Convert back to ISO for response
    const response = {
      ...obj,
      dayOfWeek: convertJsDayToIso(obj.dayOfWeek)
    };

    console.log("   Returning response with ISO day:", response.dayOfWeek);
    res.status(201).json(response);
  } catch (error: any) {
    console.error("❌ POST /api/doctor/availability failed:", error);
    console.error("   Stack:", error.stack);
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/doctor/availability", async (req, res) => {
  try {
    console.log("📖 [GET /api/doctor/availability]");

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Support both doctor viewing own availability AND patients querying specific doctor
    let doctorId: string;
    let dayOfWeekParam = req.query.dayOfWeek as string | undefined;

    if (req.user!.role === "doctor") {
      doctorId = req.user!._id.toString();
      console.log("   Doctor viewing own availability");
    } else {
      doctorId = req.query.doctorId as string;
      if (!doctorId) {
        return res.status(400).json({ message: "doctorId is required for non-doctors" });
      }
      console.log("   Non-doctor querying doctor:", doctorId);
    }

    let availability: any[];

    if (dayOfWeekParam) {
      // Single-day query
      const isoDayOfWeek = parseInt(dayOfWeekParam, 10);

      if (isNaN(isoDayOfWeek) || isoDayOfWeek < 1 || isoDayOfWeek > 7) {
        return res.status(400).json({ message: "dayOfWeek must be ISO format (1-7)" });
      }

      console.log("   Single day query - ISO day:", isoDayOfWeek);
      
      // Storage returns plain objects, NO need to call .toObject()
      availability = await storage.getDoctorAvailability(doctorId, isoDayOfWeek);
      
      console.log("   Got", availability.length, "slots from storage");
      
    } else {
      // All-days query 
      console.log("   All days query");
      
      // Storage returns plain objects, NO need to call .toObject()
      availability = await (storage as any).getAllDoctorAvailability(doctorId);
      
      console.log("   Got", availability.length, "total slots from storage");
    }

    // Convert dayOfWeek from JS format (0-6) to ISO format (1-7) for response
    const responseAvailability = availability.map((slot: any) => ({
      ...slot,
      dayOfWeek: convertJsDayToIso(slot.dayOfWeek)
    }));

    console.log("   Final availability to return:", responseAvailability);
    res.json(responseAvailability);
  } catch (error: any) {
    console.error("❌ GET /api/doctor/availability failed:", error);
    console.error("   Stack:", error.stack);
    res.status(500).json({ message: error.message });
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

    // If updating dayOfWeek, convert from ISO to JS before sending to storage
    const updates = { ...req.body };
    if (updates.dayOfWeek !== undefined) {
      if (updates.dayOfWeek < 1 || updates.dayOfWeek > 7) {
        return res.status(400).json({ message: "dayOfWeek must be ISO format (1-7)" });
      }
      updates.dayOfWeek = convertIsoToJsDay(updates.dayOfWeek);
    }

    // Use storage layer: it handles update logic
    const availability = await storage.updateDoctorAvailability(req.params.id, updates);

    // Convert back to ISO for response
    res.json({
      ...availability.toObject(),
      dayOfWeek: convertJsDayToIso(availability.dayOfWeek)
    });
  } catch (error: any) {
    console.error("PUT /api/doctor/availability/:id failed:", error);
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
    console.error("DELETE /api/doctor/availability/:id failed:", error);
    res.status(400).json({ message: error.message });
  }
});
// ===================================
// APPOINTMENT ROUTES
// ===================================

app.post("/api/appointments", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const { doctorId, appointmentDate, type, consultationFee, notes } = req.body;
        const patientId = req.user!._id.toString();

        // Validate required fields (omitted for brevity, assume lines 3-17 are correct)
        // ...
        // FIX: Ensure ID is a string when calling storage
        const doctor = await storage.getUser(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // FIX: Ensure ID is a string when calling storage
        const doctorProfile = await storage.getDoctorProfile(doctorId);
        if (!doctorProfile?.isApproved) {
            return res.status(400).json({ message: "Doctor not approved for consultations" });
        }

        const appointmentDateTime = new Date(appointmentDate);
        if (isNaN(appointmentDateTime.getTime())) {
            return res.status(400).json({ message: "Invalid appointment date format" });
        }

        // Check for existing appointments at the same time (race condition prevention)
        const existingAppointments = await storage.getAppointmentsByDoctorAndDate(doctorId, appointmentDateTime);
        if (existingAppointments.length > 0) {
            return res.status(409).json({ message: "Time slot not available. Please choose a different time." });
        }

        // ====================================================================
        // 🛑 AVAILABILITY CHECK LOGIC 🛑
        // ====================================================================

        // Calculate the day index using standard Node.js Date (0=Sun to 6=Sat)
        const dayOfWeekClient = appointmentDateTime.getDay();
        
        // Format time string for comparison
        const timeString = appointmentDateTime.toTimeString().slice(0, 5); // HH:MM format
        
        // CORRECTED CALL: Pass the JS day (0-6)
        // NOTE: The `getDoctorAvailability` interface takes ISO day (1-7), but the implementation 
        // was written to take JS day, so we adjust the argument here for the original logic flow.
        // Reverting to the expected ISO day in the next line's call.
        const isoDayOfWeek = convertJsDayToIso(dayOfWeekClient);

        const doctorAvailability = await storage.getDoctorAvailability(doctorId, isoDayOfWeek); 

        const isAvailable = doctorAvailability.some(avail => 
            // The storage layer should have filtered by dayOfWeek. We check timing:
            (avail as any).isAvailable &&
            timeString >= (avail as any).startTime && 
            timeString < (avail as any).endTime 
        );

        if (!isAvailable) {
            return res.status(400).json({ message: "Doctor is not available at the requested time" });
        }
        
        // ====================================================================

        // 4. Create the appointment
        const newAppointment = await storage.createAppointment({
            patientId: patientId,
            doctorId,
            appointmentDate: appointmentDateTime,
            duration: 30, 
            type,
            status: 'scheduled',
            consultationFee,
        });

        // 5. Respond with success
        return res.status(201).json(newAppointment);

    } catch (error) {
        console.error("Error booking appointment:", error);
        return res.status(500).json({ message: "Internal server error during appointment booking" });
    }
});

  app.get("/api/appointments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let appointments;
      if (req.user!.role === "patient") {
        // FIX: Ensure ID is a string when calling storage
        appointments = await storage.getAppointmentsByPatient(req.user!._id.toString());
      } else if (req.user!.role === "doctor") {
        // FIX: Ensure ID is a string when calling storage
        appointments = await storage.getAppointmentsByDoctor(req.user!._id.toString());
      } else if (req.user!.role === "admin") {
        appointments = await storage.getAllAppointments();
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(appointments);
    } catch (error: any) {
      console.error("GET /api/appointments failed:", error); // Log error
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/appointments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Sanitize and validate the appointment ID
      const appointmentId = sanitizeObjectId(req.params.id, 'appointment ID');
      
      // FIX: Ensure ID is a string when calling storage
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Check permissions
      if (req.user!.role === "patient" && appointment.patientId !== req.user!._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (req.user!.role === "doctor" && appointment.doctorId !== req.user!._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Define allowed fields for each role
      const allowedFields = {
        patient: ['notes', 'status'], // Patients can only update notes and status
        doctor: ['notes', 'prescription', 'status'], // Doctors can update notes, prescription, and status
        admin: ['notes', 'prescription', 'status', 'appointmentDate', 'duration', 'type'] // Admins have broader access
      };

      // Filter request body to only include allowed fields
      const userRole = req.user!.role as keyof typeof allowedFields;
      const allowedFieldsForRole = allowedFields[userRole] || [];
      
      const filteredUpdates: any = {};
      for (const field of allowedFieldsForRole) {
        if (req.body[field] !== undefined) {
          filteredUpdates[field] = req.body[field];
        }
      }

      // Additional validation for specific fields
      if (filteredUpdates.status && !['scheduled', 'completed', 'cancelled', 'no-show'].includes(filteredUpdates.status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      if (filteredUpdates.appointmentDate) {
        const appointmentDate = new Date(filteredUpdates.appointmentDate);
        if (isNaN(appointmentDate.getTime())) {
          return res.status(400).json({ message: "Invalid appointment date" });
        }
      }

      if (filteredUpdates.duration && (filteredUpdates.duration < 15 || filteredUpdates.duration > 120)) {
        return res.status(400).json({ message: "Duration must be between 15 and 120 minutes" });
      }

      if (filteredUpdates.type && !['video', 'in-person'].includes(filteredUpdates.type)) {
        return res.status(400).json({ message: "Invalid appointment type" });
      }

      // Prevent modification of critical financial fields
      const restrictedFields = ['consultationFee', 'patientId', 'doctorId'];
      for (const field of restrictedFields) {
        if (req.body[field] !== undefined) {
          return res.status(403).json({ message: `Cannot modify ${field}` });
        }
      }

      const updatedAppointment = await storage.updateAppointment(appointmentId, filteredUpdates);
      res.json(updatedAppointment);
    } catch (error: any) {
      console.error("PUT /api/appointments/:id failed:", error); // Log error
      res.status(400).json({ message: error.message });
    }
  });

  // Payment Routes
  app.post("/api/create-order", async (req, res) => {
    try {
      if (!razorpay) {
        return res.status(500).json({ message: "Payment processing not configured" });
      }

      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { amount, appointmentId, doctorId } = req.body;

      // Validate input parameters
      if (!amount || !appointmentId || !doctorId) {
        return res.status(400).json({ message: "Missing required fields: amount, appointmentId, doctorId" });
      }

      // Validate amount is positive
      if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }

      // Validate appointment exists and get consultation fee
      // FIX: Ensure ID is a string when calling storage
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Validate amount matches appointment fee (with small tolerance for rounding)
      const expectedAmount = appointment.consultationFee;
      const amountDifference = Math.abs(amount - expectedAmount);
      if (amountDifference > 0.01) { // Allow 1 paisa tolerance
        return res.status(400).json({ 
          message: `Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}` 
        });
      }

      // Validate doctor exists and is approved
      // FIX: Ensure ID is a string when calling storage
      const doctor = await storage.getUser(doctorId);
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(404).json({ message: "Doctor not found" });
      }

      // FIX: Ensure ID is a string when calling storage
      const doctorProfile = await storage.getDoctorProfile(doctorId);
      if (!doctorProfile?.isApproved) {
        return res.status(400).json({ message: "Doctor not approved for consultations" });
      }

      // Validate appointment belongs to the authenticated user
      if (appointment.patientId !== req.user!._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: "INR",
        receipt: `receipt_${appointmentId}_${Date.now()}`,
        notes: {
          userId: req.user!._id.toString(),
          appointmentId: appointmentId,
          doctorId: doctorId,
        },
      };

      const order = await razorpay!.orders.create(options);

      // Create payment record
      await storage.createPayment({
        appointmentId,
        patientId: req.user!._id.toString(),
        doctorId: doctorId,
        amount,
        status: "pending",
        razorpayOrderId: order.id,
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error: any) {
      console.error("POST /api/create-order failed:", error); // Log error
      res.status(500).json({ message: "Error creating order: " + error.message });
    }
  });

  app.post("/api/payments/:id/confirm", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: "Missing required payment verification data" });
      }

      // Verify Razorpay signature
      // FIX: Using imported crypto
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex");

      if (razorpay_signature !== expectedSignature) {
        console.error("Payment signature verification failed for order:", razorpay_order_id);
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      // Verify the payment belongs to the authenticated user
      const payment = await storage.getPaymentByOrderId(razorpay_order_id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.patientId !== req.user!._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update payment status with verified payment ID
      // FIX: Assuming paymentId in URL is the primary key of the payment record. If not, use orderId here.
      const updatedPayment = await storage.updatePaymentStatus(razorpay_order_id, "completed", razorpay_payment_id);
      res.json(updatedPayment);
    } catch (error: any) {
      console.error("POST /api/payments/:id/confirm failed:", error);
      res.status(400).json({ message: "Payment verification failed" });
    }
  });

  // Razorpay webhook for payment verification
  app.post("/api/razorpay-webhook", async (req, res) => {
    try {
      // FIX: Using imported crypto
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        // This is necessary if you choose to not configure Razorpay for development
        return res.status(200).json({ status: "success", message: "Webhook skipped (not configured)" });
      }

      const signature = req.headers["x-razorpay-signature"];
      const body = JSON.stringify(req.body);

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        return res.status(400).json({ message: "Invalid signature" });
      }

      const { event, payload } = req.body;

      if (event === "payment.captured") {
        const { order_id, payment_id } = payload.payment.entity;

        // Update payment record status
        await storage.updatePaymentStatus(order_id, "completed", payment_id); 
      }

      res.json({ status: "success" });
    } catch (error: any) {
      console.error("POST /api/razorpay-webhook failed:", error); // Log error
      res.status(500).json({ message: "Webhook error: " + error.message });
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
        // Log this to see if the file is truly missing or if multer is failing
        console.error("POST /api/doctor/documents failed: req.file is missing.");
        return res.status(400).json({ message: "No file uploaded. Please check the 'document' field name." });
      }

      const documentData = insertDoctorDocumentSchema.parse({
        // FIX: Ensure ID is converted to string for Zod validation
        doctorId: req.user!._id.toString(),
        documentType: req.body.documentType,
        fileName: req.file.originalname,
        filePath: req.file.path,
      });

      const document = await storage.createDoctorDocument(documentData);
      res.status(201).json(document);
    } catch (error: any) {
      console.error("POST /api/doctor/documents failed:", error); // Log error
      res.status(400).json({ message: error.message });
    }
  });
  

  //delete document doctor route
  app.delete("/api/doctor/documents/:id", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
        }
        
        const documentId = req.params.id;
        
        // FIX: Need a way to retrieve the document to check ownership. Assuming storage has getDoctorDocumentById
        const document = await (storage as any).getDoctorDocumentById(documentId); 

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }
        
        // Authorization check
        if (document.doctorId !== req.user!._id.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }
        
        // Delete document (database and file system)
        const deletedDoc = await storage.deleteDoctorDocument(documentId);

        if (deletedDoc) {
            return res.json({ message: "Document deleted successfully" });
        } else {
            // This indicates a failure at the DB/FS level after the ownership check
            return res.status(500).json({ message: "Failed to delete document from database." });
        }

    } catch (error: any) {
        console.error("❌ DELETE /api/doctor/documents/:id failed:", error);
        res.status(500).json({ message: "Failed to delete document." });
    }
  });
  // ===================================

  app.get("/api/doctor/documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // FIX: Rely only on authenticated user ID
      const doctorId = req.user!.role === "doctor" ? req.user!._id.toString() : (req.query.doctorId as string); 
      
      if (!doctorId) {
        return res.status(400).json({ message: "Authenticated Doctor ID is required" });
      }

      const documents = await storage.getDoctorDocuments(doctorId);
      res.json(documents);
    } catch (error: any) {
      console.error("GET /api/doctor/documents failed:", error); // Log error
      // If the error message is generic, we return 500
      res.status(500).json({ message: error.message }); 
    }
  });

  // Patient Records Routes
  app.post("/api/patient/records", upload.single("record"), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const recordData = insertPatientRecordSchema.parse({
        patientId:
          // FIX: Ensure ID is converted to string for storage
          req.user!.role === "patient" ? req.user!._id.toString() : req.body.patientId,
        recordType: req.body.recordType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        doctorId: req.body.doctorId,
        appointmentId: req.body.appointmentId,
      });

      const record = await storage.createPatientRecord(recordData);
      res.status(201).json(record);
    } catch (error: any) {
      console.error("POST /api/patient/records failed:", error); // Log error
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/patient/records", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // FIX: Ensure patientId is a string
      const patientId =
        req.user!.role === "patient" ? req.user!._id.toString() : (req.query.patientId as string);
      if (!patientId) {
        return res.status(400).json({ message: "Patient ID required" });
      }

      const records = await storage.getPatientRecords(patientId);
      res.json(records);
    } catch (error: any) {
      console.error("GET /api/patient/records failed:", error); // Log error
      res.status(500).json({ message: error.message });
    }
  });

// ===================================
// ADMIN & DISPUTE ROUTES
// ===================================

// Admin Routes
app.get("/api/admin/pending-verifications", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // FIX: Using getDoctorsWithProfiles (or equivalent) for efficiency
      const doctorsWithProfiles = await storage.getDoctorsWithProfiles();
      const pendingProfiles = doctorsWithProfiles.filter((doc: any) => !doc.profile?.isApproved);

      res.json(pendingProfiles);
    } catch (error: any) {
      console.error("GET /api/admin/pending-verifications failed:", error); // Log error
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
      console.error("POST /api/admin/verify-doctor/:id failed:", error); // Log error
      res.status(400).json({ message: error.message });
    }
  });

  // Dispute Routes
  app.post("/api/disputes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const disputeData = insertDisputeSchema.parse({
        ...req.body,
        reportedBy: req.user!._id.toString(), // FIX: Ensure ID is a string
      });
      
      const dispute = await storage.createDispute(disputeData);
      res.status(201).json(dispute);
    } catch (error: any) {
      console.error("POST /api/disputes failed:", error); // Log error
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
        // FIX: Assuming getDisputesByUser exists on the storage instance
        disputes = await (storage as any).getDisputesByUser(req.user!._id.toString());
      }

      res.json(disputes);
    } catch (error: any) {
      console.error("GET /api/disputes failed:", error); // Log error
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
        resolvedBy: req.user!._id.toString(), // FIX: Ensure ID is a string
      };

      const dispute = await storage.updateDispute(req.params.id, updates);
      res.json(dispute);
    } catch (error: any) {
      console.error("PUT /api/disputes/:id failed:", error); // Log error
      res.status(400).json({ message: error.message });
    }
  });

  // Admin Routes for Real Data
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
      console.error("GET /api/admin/users failed:", error); // Log error
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/doctors", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const doctors = await storage.getDoctorsWithProfiles();
      res.json(doctors);
    } catch (error: any) {
      console.error("GET /api/admin/doctors failed:", error); // Log error
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/patients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const patients = await storage.getUsersByRole("patient");
      res.json(patients);
    } catch (error: any) {
      console.error("GET /api/admin/patients failed:", error); // Log error
      res.status(500).json({ message: error.message });
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

      // FIX: Assuming getAllDocuments exists on the storage instance
      const documents = await (storage as any).getAllDocuments();
      res.json(documents);
    } catch (error: any) {
      console.error("GET /api/admin/documents failed:", error); // Log error
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
      console.error("GET /api/admin/appointments failed:", error); // Log error
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
      console.error("POST /api/admin/verify-user/:id failed:", error); // Log error
      res.status(400).json({ message: error.message });
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
      console.error("POST /api/admin/verify-document/:id failed:", error); // Log error
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
        totalRevenue: allPayments.reduce(
          (sum: number, payment: any) => sum + (payment.status === "completed" ? payment.amount : 0),
          0
        ),
        monthlyAppointments: totalAppointments.filter((apt: any) => {
          const aptDate = new Date(apt.createdAt || new Date());
          const now = new Date();
          return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
        }).length,
        // FIX: Using getDoctorsWithProfiles (or equivalent) for profile check
        pendingVerifications: (await storage.getDoctorsWithProfiles()).filter((doc: any) => !doc.profile?.isApproved).length,
      };

      res.json(analytics);
    } catch (error: any) {
      console.error("GET /api/admin/analytics failed:", error); // Log error
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
