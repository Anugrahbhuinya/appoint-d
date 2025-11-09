import mongoose from 'mongoose';
import type { Express } from "express";
import { createServer, type Server } from "http";
import Razorpay from "razorpay";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import express from 'express';
import { DoctorAvailability } from "@shared/mongodb-schema";
import crypto from 'crypto';
import {
    insertDoctorProfileSchema,
    insertAppointmentSchema, // <-- Now properly imported and used
    insertPaymentSchema,
    insertDoctorDocumentSchema,
    insertPatientRecordSchema,
    insertDoctorAvailabilitySchema,
    insertDisputeSchema,
    insertUserSchema,
} from "@shared/mongodb-schema";
import {
    sanitizeObjectId,
} from "./security-utils";
import fs from 'fs/promises';
import { z } from 'zod'; // <-- Ensure Zod is imported for error checking


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

// File upload setup (General)
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

// NEW MULTER CONFIG FOR DOCTOR PROFILE PICTURES
const profilePicUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(process.cwd(), 'public', 'uploads', 'doctor-profiles');
            try {
                if (!require('fs').existsSync(dir)) {
                    require('fs').mkdirSync(dir, { recursive: true });
                }
                cb(null, dir);
            } catch (err: any) {
                console.error('Failed to create directory:', err);
                cb(err);
            }
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            console.log('File extension:', ext);

            let finalExt = ext;
            if (!finalExt) {
                const mimeToExt: { [key: string]: string } = {
                    'image/jpeg': '.jpg',
                    'image/png': '.png',
                    'image/gif': '.gif',
                    'image/webp': '.webp',
                };
                finalExt = mimeToExt[file.mimetype] || '.jpg';
                console.log('Inferred extension:', finalExt);
            }

            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const filename = `${uniqueSuffix}${finalExt}`;

            console.log('Final filename:', filename);
            cb(null, filename);
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req, file, cb) => {
        console.log('📸 [Multer fileFilter] Checking file:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });

        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (allowedMimes.includes(file.mimetype)) {
            console.log('  ✅ File allowed');
            cb(null, true);
        } else {
            console.log('  ❌ File rejected - invalid MIME type');
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
        }
    },
});


// Ensure uploads directory exists for doctor profiles
(async () => {
    try {
        await fs.mkdir('public/uploads/doctor-profiles', { recursive: true });
        console.log('✅ Doctor profiles upload directory ready');
    } catch (error) {
        console.error('❌ Failed to create upload directory:', error);
    }
})();
// END NEW MULTER CONFIG

const convertIsoToJsDay = (isoDay: number): number => {
    // ISO: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
    // JS:  1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
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

    // Debug: Connection info
    app.get("/api/debug/connection-info", async (req, res) => {
        try {
            const connection = mongoose.connection;
            const collections = await connection.db.listCollections().toArray();

            res.json({
                databaseName: connection.name,
                collections: collections.map((c: any) => c.name),
                userCount: await connection.collection('users').countDocuments(),
                doctorCount: await connection.collection('users').countDocuments({ role: 'doctor' }),
                profileCount: await connection.collection('doctorprofiles').countDocuments(),
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Debug: Get raw doctors
    app.get("/api/debug/raw-doctors", async (req, res) => {
        try {
            const doctors = await storage.getUsersByRole("doctor");
            res.json({
                count: doctors.length,
                doctors: doctors.map((d: any) => ({
                    _id: d._id.toString(),
                    firstName: d.firstName,
                    lastName: d.lastName,
                    email: d.email
                }))
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Debug: Get raw profiles
    app.get("/api/debug/raw-profiles", async (req, res) => {
        try {
            const profiles = await storage.getDoctorProfiles();
            res.json({
                count: profiles.length,
                profiles: profiles.map((p: any) => ({
                    _id: p._id.toString(),
                    userId: p.userId instanceof mongoose.Types.ObjectId ? p.userId.toString() : p.userId,
                    specialization: p.specialization,
                    isApproved: p.isApproved
                }))
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Debug: Test getDoctorsWithProfiles
    app.get("/api/debug/get-doctors-with-profiles", async (req, res) => {
        try {
            const result = await storage.getDoctorsWithProfiles();
            res.json({
                count: result.length,
                doctors: result.map((d: any) => ({
                    _id: d._id.toString(),
                    firstName: d.firstName,
                    lastName: d.lastName,
                    hasProfile: !!d.profile,
                    specialization: d.profile?.specialization,
                    isApproved: d.profile?.isApproved
                }))
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    // === STATIC FILE SERVING FOR DOWNLOADS ===
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
    app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
    // =========================================


    // === AUTHENTICATION ROUTES ===

    app.post("/api/register", async (req, res, next) => {
        try {
            const validatedData = insertUserSchema.parse(req.body);

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

            req.login(user.toObject(), (err) => {
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

    app.post("/api/login", passport.authenticate("local"), (req, res) => {
        if (req.user) {
            res.status(200).json(req.user);
        } else {
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

            const fullUser = await storage.getUser(req.user!._id.toString());

            if (!fullUser) return res.sendStatus(401);

            res.json(fullUser.toObject());

        } catch (error) {
            console.error("GET /api/user failed:", error);
            res.status(500).json({ message: "Internal Server Error during user retrieval." });
        }
    });
    // ========================================================

    // === PROFILE PICTURE UPLOAD (Doctor & Patient) - EXISTING LOGIC REMOVED/REPLACED ===
    app.post("/api/upload/profile-picture", upload.single("image"), async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }
            if (!req.file) {
                return res.status(400).json({ message: "No image uploaded" });
            }

            const crop = req.body.crop ? JSON.parse(req.body.crop) : undefined;
            const nudge = req.body.nudge ? JSON.parse(req.body.nudge) : undefined;

            const ext = path.extname(req.file.originalname) || ".jpg";
            const outputFileName = `profile_${req.user!._id.toString()}_${Date.now()}${ext}`;
            const outputPath = path.join("uploads", outputFileName);

            const { processProfileImage } = await import("./image-utils.js");
            await processProfileImage(req.file.path, outputPath, crop, nudge);

            let updated;
            if (req.user!.role === "doctor") {
                updated = await storage.updateDoctorProfile(req.user!._id.toString(), { profilePicture: outputPath });
            } else {
                updated = await storage.updateUser(req.user!._id.toString(), { profilePicture: outputPath });
            }

            res.json({ success: true, profilePicture: outputPath, updated });
        } catch (error: any) {
            console.error("POST /api/upload/profile-picture failed:", error);
            res.status(500).json({ message: error.message || "Failed to upload profile picture." });
        }
    });
    // ========================================================

    // --------------------------------------------------------
    // === NEW DOCTOR PROFILE ROUTES WITH FILE UPLOAD ===
    // --------------------------------------------------------

    // POST /api/doctor/profile - Create profile with picture
    app.post("/api/doctor/profile", async (req, res) => {
        try {
            console.log('\n====== [POST /api/doctor/profile] ======');

            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            if (req.user!.role !== "doctor") {
                return res.status(403).json({ message: "Doctor access required" });
            }

            const userId = req.user!._id.toString();
            const {
                specialization,
                experience,
                consultationFee,
                bio,
                qualifications,
                hospitalAffiliation,
                licenseNumber,
                profilePicture, // Base64 data URL
            } = req.body;

            if (profilePicture) {
                console.log('📸 Profile picture: ' + (profilePicture.length / 1024).toFixed(2) + ' KB');
            }

            let parsedQualifications: string[] = [];
            if (qualifications) {
                try {
                    parsedQualifications = typeof qualifications === 'string'
                        ? JSON.parse(qualifications)
                        : qualifications;
                } catch (e) {
                    parsedQualifications = [];
                }
            }

            const validatedData = insertDoctorProfileSchema.parse({
                userId,
                specialization,
                experience: parseInt(experience) || 0,
                consultationFee: parseFloat(consultationFee) || 0,
                bio: bio || '',
                qualifications: parsedQualifications,
                hospitalAffiliation: hospitalAffiliation || '',
                licenseNumber: licenseNumber || '',
                isApproved: false,
                rating: 0,
                totalReviews: 0,
            });

            const profile = await storage.createDoctorProfile(validatedData);

            if (profilePicture) {
                const updatedProfile = await storage.updateDoctorProfile(userId, {
                    profilePicture,
                });
                console.log('✅ Profile created with picture');
                return res.status(201).json(updatedProfile);
            }

            console.log('✅ Profile created without picture');
            res.status(201).json(profile);
        } catch (error: any) {
            console.error("POST /api/doctor/profile failed:", error);
            res.status(400).json({ message: error.message || "Failed to create doctor profile" });
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
            if (!profile) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }

            res.json(profile);
        } catch (error: any) {
            console.error("GET /api/doctor/profile failed:", error); // Log error
            res.status(500).json({ message: error.message });
        }
    });

    //profile debug routes

    app.get("/api/debug/uploads", async (req, res) => {
        try {
            const uploadsPath = path.join(process.cwd(), 'public', 'uploads', 'doctor-profiles');
            const exists = await fs.stat(uploadsPath).then(() => true).catch(() => false);

            let files: string[] = [];
            if (exists) {
                files = await fs.readdir(uploadsPath);
            }

            res.json({
                uploadsPath,
                exists,
                files: files.slice(0, 10), // First 10 files
                fileCount: files.length,
                serverUrl: `${req.protocol}://${req.hostname}:${req.socket.localPort || 5000}`
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
    // PUT /api/doctor/profile - Update profile with optional picture
    app.put("/api/doctor/profile", async (req, res) => {
        try {
            console.log('\n====== [PUT /api/doctor/profile] ======');
            console.log('Body keys:', Object.keys(req.body));

            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            if (req.user!.role !== "doctor") {
                return res.status(403).json({ message: "Doctor access required" });
            }

            const userId = req.user!._id.toString();

            const currentProfile = await storage.getDoctorProfile(userId);

            if (!currentProfile) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }

            const {
                specialization,
                experience,
                consultationFee,
                bio,
                qualifications,
                hospitalAffiliation,
                licenseNumber,
                profilePicture, // This will be a Base64 data URL like "data:image/jpeg;base64,..."
            } = req.body;

            if (profilePicture) {
                console.log('📸 Profile picture provided');
                console.log('   Type: Base64 Data URL');
                console.log('   Size: ' + (profilePicture.length / 1024).toFixed(2) + ' KB');
            }

            let parsedQualifications = currentProfile.qualifications;
            if (qualifications) {
                try {
                    parsedQualifications = typeof qualifications === 'string'
                        ? JSON.parse(qualifications)
                        : qualifications;
                } catch (e) {
                    console.error('Failed to parse qualifications:', e);
                }
            }

            const updates: any = {
                specialization: specialization || currentProfile.specialization,
                experience: experience ? parseInt(experience) : currentProfile.experience,
                consultationFee: consultationFee ? parseFloat(consultationFee) : currentProfile.consultationFee,
                bio: bio || currentProfile.bio,
                qualifications: parsedQualifications,
                hospitalAffiliation: hospitalAffiliation || currentProfile.hospitalAffiliation,
                licenseNumber: licenseNumber || currentProfile.licenseNumber,
                // Include other properties that might be updated from the frontend form submission
                gender: req.body.gender || currentProfile.gender, 
                clinicAddress: req.body.clinicAddress || currentProfile.clinicAddress
            };

            // Store Base64 directly in database
            if (profilePicture) {
                updates.profilePicture = profilePicture;
                console.log('✅ Profile picture will be saved as Base64 data URL');
            } else if (req.body.profilePicture === "") {
                // Handle explicit removal of profile picture
                updates.profilePicture = undefined;
            }


            console.log('💾 Updating profile in database...');
            const updatedProfile = await storage.updateDoctorProfile(userId, updates);

            console.log('✅ Profile updated successfully');
            console.log('   Picture stored: ' + (updatedProfile.profilePicture ? 'Yes' : 'No'));
            console.log('=====================================\n');

            res.json(updatedProfile);
        } catch (error: any) {
            console.error("❌ Error updating profile:", error.message);
            console.error("Stack:", error.stack);
            res.status(400).json({ message: error.message || "Failed to update doctor profile" });
        }
    });

    // POST /api/doctor/profile/picture/remove - Remove profile picture
    app.post("/api/doctor/profile/picture/remove", async (req, res) => {
        try {
            console.log('\n====== [POST /api/doctor/profile/picture/remove] ======');

            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            if (req.user!.role !== "doctor") {
                return res.status(403).json({ message: "Doctor access required" });
            }

            const userId = req.user!._id.toString();
            const profile = await storage.getDoctorProfile(userId);

            if (!profile) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }

            if (!profile.profilePicture) {
                return res.status(400).json({ message: "No profile picture to delete" });
            }

            console.log('🗑️ Removing profile picture...');

            // Update profile to remove picture
            const updatedProfile = await storage.updateDoctorProfile(userId, {
                profilePicture: undefined,
            });

            console.log('✅ Profile picture removed');
            console.log('=====================================\n');

            res.json(updatedProfile);
        } catch (error: any) {
            console.error("❌ Error removing picture:", error.message);
            res.status(400).json({ message: error.message || "Failed to remove profile picture" });
        }
    });

    // DELETE /api/doctor/profile/picture - Delete profile picture
    app.delete("/api/doctor/profile/picture", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            if (req.user!.role !== "doctor") {
                return res.status(403).json({ message: "Doctor access required" });
            }

            const userId = req.user!._id.toString();
            const profile = await storage.getDoctorProfile(userId);

            if (!profile) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }

            if (!profile.profilePicture) {
                return res.status(400).json({ message: "No profile picture to delete" });
            }

            // Delete file from storage
            const picPath = path.join(process.cwd(), 'public', profile.profilePicture);
            try {
                await fs.unlink(picPath);
                console.log('✅ Deleted profile picture:', picPath);
            } catch (error) {
                console.warn('⚠️ Could not delete profile picture file:', error);
            }

            // Update profile to remove picture URL
            const updatedProfile = await storage.updateDoctorProfile(userId, {
                profilePicture: undefined,
            });

            res.json(updatedProfile);
        } catch (error: any) {
            console.error("DELETE /api/doctor/profile/picture failed:", error);
            res.status(500).json({ message: error.message || "Failed to delete profile picture" });
        }
    });

    // --------------------------------------------------------
    // === END NEW DOCTOR PROFILE ROUTES ===
    // --------------------------------------------------------

    // Doctor Search Routes
    app.get("/api/doctors", async (req, res) => {
        try {
            console.log("\n🏥 [GET /api/doctors] REQUEST");

            const doctors = await storage.getDoctorsWithProfiles();

            console.log(`✅ Retrieved ${doctors.length} doctors`);

            // Convert to plain objects before sending
            const plainDoctors = doctors.map((doc: any) => ({
                _id: doc._id?.toString?.() || doc._id,
                firstName: doc.firstName,
                lastName: doc.lastName,
                email: doc.email,
                role: doc.role,
                profile: doc.profile ? {
                    _id: doc.profile._id?.toString?.() || doc.profile._id,
                    specialization: doc.profile.specialization,
                    experience: doc.profile.experience,
                    consultationFee: doc.profile.consultationFee,
                    bio: doc.profile.bio,
                    isApproved: doc.profile.isApproved,
                    rating: doc.profile.rating
                } : null
            }));

            console.log(`📝 Converted to plain objects:`, plainDoctors);

            res.status(200).json(plainDoctors);

        } catch (error: any) {
            console.error("❌ ERROR:", error);
            res.status(500).json({ message: error.message });
        }
    });

    app.get("/api/doctors/:id", async (req, res) => {
        try {
            // Sanitize and validate the doctor ID
            const doctorId = sanitizeObjectId(req.params.id, 'doctor ID');

            const doctor = await storage.getUser(doctorId);
            if (!doctor || doctor.role !== "doctor") {
                return res.status(404).json({ message: "Doctor not found" });
            }

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

            console.log("   Incoming day (ISO):", incomingDay);

            const availabilityData = insertDoctorAvailabilitySchema.parse({
                ...req.body,
                dayOfWeek: convertIsoToJsDay(incomingDay), // Convert ISO (1-7) to JS (0-6) for storage
                doctorId: req.user!._id.toString(),
            });

            console.log("   Parsed data with JS day:", availabilityData.dayOfWeek);

            const availability = await storage.createDoctorAvailability(availabilityData);

            console.log("   Created availability:", availability);

            // 🛑 FIX: Check if toObject exists before calling (for safety)
            const obj = availability.toObject ? availability.toObject() : availability;

            // Convert back to ISO for response
            const response = {
                ...obj,
                dayOfWeek: convertJsDayToIso(obj.dayOfWeek)
            };

            console.log("   Returning response with ISO day:", response.dayOfWeek);
            res.status(201).json(response);
        } catch (error: any) {
            console.error("❌ POST /api/doctor/availability failed:", error);
            console.error("   Stack:", error.stack);
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
                console.log("   Doctor viewing own availability");
            } else {
                doctorId = req.query.doctorId as string;
                if (!doctorId) {
                    return res.status(400).json({ message: "doctorId is required for non-doctors" });
                }
                console.log("   Non-doctor querying doctor:", doctorId);
            }

            let availability: any[];

            if (dayOfWeekParam) {
                // Single-day query
                const isoDayOfWeek = parseInt(dayOfWeekParam, 10);

                if (isNaN(isoDayOfWeek) || isoDayOfWeek < 1 || isoDayOfWeek > 7) {
                    return res.status(400).json({ message: "dayOfWeek must be ISO format (1-7)" });
                }

                console.log("   Single day query - ISO day:", isoDayOfWeek);

                // Storage returns plain objects, NO need to call .toObject()
                availability = await storage.getDoctorAvailability(doctorId, isoDayOfWeek);

                console.log("   Got", availability.length, "slots from storage");

            } else {
                // All-days query
                console.log("   All days query");

                // Storage returns plain objects, NO need to call .toObject()
                availability = await (storage as any).getAllDoctorAvailability(doctorId);

                console.log("   Got", availability.length, "total slots from storage");
            }

            // Convert dayOfWeek from JS format (0-6) to ISO format (1-7) for response
            const responseAvailability = availability.map((slot: any) => ({
                ...slot,
                dayOfWeek: convertJsDayToIso(slot.dayOfWeek)
            }));

            console.log("   Final availability to return:", responseAvailability);
            res.json(responseAvailability);
        } catch (error: any) {
            console.error("❌ GET /api/doctor/availability failed:", error);
            console.error("   Stack:", error.stack);
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
            console.    error("DELETE /api/doctor/availability/:id failed:", error);
            res.status(400).json({ message: error.message });
        }
    });
    // ===================================
    // APPOINTMENT ROUTES
    // ===================================

    // Modified POST /api/appointments route
    app.post("/api/appointments", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const patientId = req.user!._id.toString();

            // 🎯 CRITICAL STEP: Validate and transform the request body using Zod
            const validatedData = insertAppointmentSchema.parse({
                ...req.body,
                patientId: patientId, // Inject the authenticated patientId
            });

            // Create the appointment using the fully validated and type-safe data
            const newAppointment = await storage.createAppointment({
                patientId: validatedData.patientId,
                doctorId: validatedData.doctorId,
                appointmentDate: validatedData.appointmentDate, // This is now a valid Date object
                duration: 30, // Assuming a default/fixed duration
                type: validatedData.type,
                status: 'pending', // New initial status is 'pending'
                consultationFee: validatedData.consultationFee,
                notes: validatedData.notes || ''
            });

            console.log(`✅ Appointment created with status 'pending': ${newAppointment._id}`);

            // Respond with success
            return res.status(201).json(newAppointment);

        } catch (error: any) {
            console.error("❌ Error booking appointment:", error);
            
            // ✅ IMPROVED ERROR HANDLING: Catch Zod validation errors (400)
            if (error instanceof z.ZodError) {
                return res.status(400).json({ 
                    message: "Invalid data provided for appointment", 
                    errors: error.errors 
                });
            }

            // Catch all other unhandled database/server errors (500)
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
                appointments = await storage.getAppointmentsByPatient(req.user!._id.toString());
            } else if (req.user!.role === "doctor") {
                // FIX: Doctor fetches ALL their appointments (the frontend filters which list they show up in)
                appointments = (await storage.getAppointmentsByDoctor(req.user!._id.toString()));
                
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
            const validStatuses = ['scheduled', 'completed', 'cancelled', 'no-show', 'awaiting_payment', 'confirmed', 'pending'];
            if (filteredUpdates.status && !validStatuses.includes(filteredUpdates.status)) {
                return res.status(400).json({ message: "Invalid status value" });
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

    // --- NEW APPOINTMENT FLOW ROUTES START HERE ---

    // ✅ 1. GET APPOINTMENT REQUESTS (Pending - Status: 'pending')
    app.get("/api/doctor/appointment-requests", async (req, res) => {
        try {
            console.log("\n📋 [GET /api/doctor/appointment-requests]");

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res.status(401).json({ message: "Authentication required or not a doctor" });
            }

            const doctorId = req.user!._id.toString();

            // Fetch only appointments with status 'pending'
            const pendingAppointments = await storage.getAppointmentsByDoctor(doctorId);

            const appointmentRequests = pendingAppointments.filter(
                (apt: any) => apt.status === "pending"
            );

            console.log(`   Found ${appointmentRequests.length} pending requests`);

            // Enrich with patient details (assuming storage.getUser exists and is robust)
            const enrichedRequests = await Promise.all(
                appointmentRequests.map(async (apt: any) => {
                    const patient = await storage.getUser(apt.patientId);
                    return {
                        _id: apt._id,
                        appointmentId: apt._id,
                        patientId: apt.patientId,
                        patientName: `${patient?.firstName} ${patient?.lastName}`,
                        patientEmail: patient?.email,
                        requestDate: apt.createdAt,
                        preferredDate: apt.appointmentDate,
                        preferredTime: new Date(apt.appointmentDate).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                        }),
                        consultationType: apt.type === "video" ? "Video Call" : "In-Person",
                        duration: `${apt.duration} mins`,
                        status: "pending",
                        fee: apt.consultationFee,
                        notes: apt.notes,
                    };
                })
            );

            res.json(enrichedRequests);
        } catch (error: any) {
            console.error("❌ GET /api/doctor/appointment-requests failed:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // ✅ 2. GET AWAITING PAYMENT APPOINTMENTS (Status: 'awaiting_payment')
    app.get("/api/doctor/awaiting-payment-appointments", async (req, res) => {
        try {
            console.log("\n⏳ [GET /api/doctor/awaiting-payment-appointments]");

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res.status(401).json({ message: "Authentication required or not a doctor" });
            }

            const doctorId = req.user!._id.toString();

            // Fetch only appointments with status 'awaiting_payment'
            const allAppointments = await storage.getAppointmentsByDoctor(doctorId);

            const awaitingPaymentAppointments = allAppointments.filter(
                (apt: any) => apt.status === "awaiting_payment"
            );

            console.log(`   Found ${awaitingPaymentAppointments.length} appointments awaiting payment`);

            // Enrich with patient details
            const enrichedAppointments = await Promise.all(
                awaitingPaymentAppointments.map(async (apt: any) => {
                    const patient = await storage.getUser(apt.patientId);
                    return {
                        _id: apt._id,
                        appointmentId: apt._id,
                        patientId: apt.patientId,
                        patientName: `${patient?.firstName} ${patient?.lastName}`,
                        patientEmail: patient?.email,
                        appointmentDate: apt.appointmentDate,
                        appointmentTime: new Date(apt.appointmentDate).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                        }),
                        consultationType: apt.type === "video" ? "Video Call" : "In-Person",
                        duration: `${apt.duration} mins`,
                        status: "awaiting_payment",
                        fee: apt.consultationFee,
                        notes: apt.notes,
                    };
                })
            );

            res.json(enrichedAppointments);
        } catch (error: any) {
            console.error("❌ GET /api/doctor/awaiting-payment-appointments failed:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // ✅ 3. DOCTOR ACCEPT APPOINTMENT REQUEST (pending -> awaiting_payment)
    app.post("/api/doctor/appointment-requests/:id/accept", async (req, res) => {
        try {
            console.log(`\n✅ [POST /api/doctor/appointment-requests/:id/accept]`);
            console.log(`   appointmentId: ${req.params.id}`);

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res.status(401).json({ message: "Authentication required or not a doctor" });
            }

            const appointmentId = req.params.id;
            const doctorId = req.user!._id.toString();

            const appointment = await storage.getAppointment(appointmentId);
            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }
            if (appointment.doctorId !== doctorId) {
                return res.status(403).json({ message: "This appointment is not yours" });
            }
            if (appointment.status !== "pending") {
                return res.status(400).json({ message: "Only pending requests can be accepted" });
            }

            const doctor = await storage.getUser(doctorId);

            // Update status to "awaiting_payment"
            await storage.updateAppointment(appointmentId, { status: "awaiting_payment" });

            console.log(`✅ Appointment status updated to: awaiting_payment`);

            // Send notification to patient
            await storage.createNotification({
                recipientId: appointment.patientId,
                type: "payment_pending",
                title: `Dr. ${doctor?.firstName} ${doctor?.lastName} Accepted Your Request!`,
                message: `Your appointment is confirmed. Please complete the payment of ₹${appointment.consultationFee} to finalize.`,
                appointmentId,
                appointmentDate: appointment.appointmentDate,
                consultationFee: appointment.consultationFee,
                doctorId,
                read: false,
                createdAt: new Date(),
                notificationChannels: ["email", "inapp"],
            });

            console.log(`✅ Notification sent to patient`);

            res.json({
                success: true,
                message: "Request accepted. Patient has been notified to proceed with payment.",
            });
        } catch (error: any) {
            console.error("❌ Error accepting appointment request:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // ✅ 4. DOCTOR REJECT APPOINTMENT REQUEST (pending -> cancelled)
    app.post("/api/doctor/appointment-requests/:id/reject", async (req, res) => {
        try {
            console.log(`\n❌ [POST /api/doctor/appointment-requests/:id/reject]`);

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res.status(401).json({ message: "Authentication required or not a doctor" });
            }

            const appointmentId = req.params.id;
            const doctorId = req.user!._id.toString();
            const { reason } = req.body;

            const appointment = await storage.getAppointment(appointmentId);
            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }
            if (appointment.doctorId !== doctorId) {
                return res.status(403).json({ message: "This appointment is not yours" });
            }
            if (appointment.status !== "pending") {
                return res.status(400).json({ message: "Only pending requests can be rejected" });
            }

            const doctor = await storage.getUser(doctorId);

            // Update status to "cancelled"
            await storage.updateAppointment(appointmentId, {
                status: "cancelled",
                notes: `Rejected by doctor: ${reason || "No reason provided"}`
            });

            console.log(`✅ Appointment rejected and cancelled`);

            // Send notification to patient
            await storage.createNotification({
                recipientId: appointment.patientId,
                type: "appointment_rejected",
                title: `Appointment Request Declined`,
                message: `Dr. ${doctor?.firstName} ${doctor?.lastName} was unable to accept your appointment request. ${reason ? `Reason: ${reason}` : ""}`,
                appointmentId,
                appointmentDate: appointment.appointmentDate,
                doctorId,
                read: false,
                createdAt: new Date(),
                notificationChannels: ["email", "inapp"],
            });

            console.log(`✅ Rejection notification sent to patient`);

            res.json({
                success: true,
                message: "Request rejected. Patient has been notified.",
            });
        } catch (error: any) {
            console.error("❌ Error rejecting appointment request:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // Removed the redundant /api/doctor/confirm-appointment-ready/:appointmentId route 
    // as its logic is now covered by the /accept route in the new flow.

    // ===================================
    // END - NEW APPOINTMENT SEPARATION ROUTES
    // ===================================


    // ✅ Doctor’s Notification Count/List (Includes pending and awaiting_payment)
    app.get("/api/doctor/notifications", async (req, res) => {
        try {
            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res.status(401).json({ message: "Authentication required or not a doctor" });
            }

            const doctorId = req.user!._id.toString();

            // Fetch all appointments that require doctor action or patient payment
            const allAppointments = await storage.getAppointmentsByDoctor(doctorId);

            const filtered = allAppointments.filter(
                (a: any) =>
                    a.status === "pending" ||
                    a.status === "awaiting_payment"
            );

            res.json(filtered);
        } catch (error: any) {
            console.error("❌ GET /api/doctor/notifications failed:", error);
            res.status(500).json({ message: error.message });
        }
    });


    // ===================================
    // NOTIFICATION ROUTES (Standard)
    // ===================================

    // POST /api/notifications - Create & send notification
    app.post("/api/notifications", async (req, res) => {
        try {
            const {
                recipientId,
                type,
                title,
                message,
                appointmentId,
                appointmentDate,
                consultationFee,
                doctorId,
                notificationChannels, // Get the value, even if it's null or undefined
            } = req.body;

            // ✅ FIX: Create a guaranteed array, using the default if the provided value is null or undefined
            const finalChannels = notificationChannels || ["email", "inapp"];

            if (!recipientId || !type || !title || !message) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            console.log('📢 [POST /api/notifications]');

            const recipient = await storage.getUser(recipientId);
            if (!recipient) {
                return res.status(404).json({ message: "Recipient not found" });
            }

            // Create in-app notification record
            const notification = await storage.createNotification({
                recipientId,
                type,
                title,
                message,
                appointmentId: appointmentId || null,
                read: false,
                createdAt: new Date(),
                notificationChannels: finalChannels, // Use finalChannels
                consultationFee,
                appointmentDate,
                doctorId,
            });

            // Send EMAIL if requested (Placeholder logic)
            if (finalChannels.includes("email")) {
                try {
                    console.log(`   📧 Email queued for ${recipient.email}`);
                } catch (error) {
                    console.error('⚠️ Email sending failed:', error);
                }
            }

            res.status(201).json({
                success: true,
                notification,
                message: "Notification sent via " + finalChannels.join(" and "),
            });
        } catch (error: any) {
            console.error("❌ POST /api/notifications failed:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // GET /api/notifications - Get user's notifications
    app.get("/api/notifications", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const recipientId = req.user!._id.toString();

            const notifications = await storage.getNotificationsByRecipient(recipientId);

            res.json(notifications);
        } catch (error: any) {
            console.error("❌ GET /api/notifications failed:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // PUT /api/notifications/:id - Mark notification as read
    app.put("/api/notifications/:id", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const { read } = req.body;
            const notificationId = req.params.id;

            const notification = await storage.updateNotification(notificationId, {
                read,
            });

            res.json(notification);
        } catch (error: any) {
            console.error("❌ PUT /api/notifications/:id failed:", error);
            res.status(400).json({ message: error.message });
        }
    });

    // DELETE /api/notifications/:id - Delete notification
    app.delete("/api/notifications/:id", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const notificationId = req.params.id;

            await storage.deleteNotification(notificationId);

            res.json({ message: "Notification deleted successfully" });
        } catch (error: any) {
            console.error("❌ DELETE /api/notifications/:id failed:", error);
            res.status(400).json({ message: error.message });
        }
    });

    // ===================================
    // END NOTIFICATION ROUTES
    // ==================================


    // Payment Routes
    // ✅ FIXED Payment Routes
app.post("/api/create-order", async (req, res) => {
    try {
        console.log("\n💳 [POST /api/create-order]");
        console.log("   Body:", req.body);

        if (!razorpay) {
            console.error("❌ Razorpay not configured");
            return res.status(500).json({ 
                message: "Payment processing not configured. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env" 
            });
        }

        if (!req.isAuthenticated()) {
            console.error("❌ Not authenticated");
            return res.status(401).json({ message: "Authentication required" });
        }

        const { amount, appointmentId, doctorId } = req.body;

        // Validation checks
        if (!amount || !appointmentId || !doctorId) {
            console.error("❌ Missing required fields:", { amount, appointmentId, doctorId });
            return res.status(400).json({ 
                message: "Missing required fields: amount, appointmentId, doctorId" 
            });
        }

        console.log("   ✅ All required fields present");

        // Fetch appointment
        console.log(`   🔍 Fetching appointment: ${appointmentId}`);
        const appointment = await storage.getAppointment(appointmentId);
        
        if (!appointment) {
            console.error("❌ Appointment not found");
            return res.status(404).json({ message: "Appointment not found" });
        }

        console.log("   ✅ Appointment found");

        // Verify amount matches
        const expectedAmount = appointment.consultationFee;
        const amountDifference = Math.abs(amount - expectedAmount);
        
        if (amountDifference > 0.01) {
            console.error(`❌ Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}`);
            return res.status(400).json({
                message: `Amount mismatch. Expected: ₹${expectedAmount}, Received: ₹${amount}`
            });
        }

        console.log("   ✅ Amount verified");

        // Verify appointment belongs to authenticated patient
        const patientId = req.user!._id.toString();
        if (appointment.patientId !== patientId) {
            console.error("❌ Appointment doesn't belong to this patient");
            return res.status(403).json({ message: "This appointment is not yours" });
        }

        console.log("   ✅ Patient verified");

        // Create Razorpay order
        console.log(`   💰 Creating Razorpay order for ₹${amount}...`);
        
        const options = {
            amount: Math.round(amount * 100), // Convert to paise
            currency: "INR",
            receipt: `receipt_${appointmentId}_${Date.now()}`,
            notes: {
                userId: patientId,
                appointmentId: appointmentId,
                doctorId: doctorId,
            },
        };

        console.log("   Razorpay options:", options);

        const order = await razorpay!.orders.create(options);

        console.log("   ✅ Razorpay order created:", order.id);

        // Create payment record in database
        console.log("   💾 Creating payment record...");
        await storage.createPayment({
            appointmentId,
            patientId: patientId,
            doctorId: doctorId,
            amount,
            status: "pending",
            razorpayOrderId: order.id,
        });

        console.log("   ✅ Payment record created");

        // Return order details
        const response = {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
        };

        console.log("   📤 Sending response:", response);
        res.json(response);

    } catch (error: any) {
        console.error("❌ POST /api/create-order failed");
        console.error("   Error message:", error.message);
        console.error("   Error stack:", error.stack);
        
        // Return a detailed error message
        res.status(500).json({ 
            message: `Error creating order: ${error.message || 'Unknown error'}`,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

    // ✅ 5. CORRECTED PAYMENT CONFIRMATION ROUTE (awaiting_payment -> scheduled)
    app.post("/api/payments/:id/confirm", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ message: "Missing required payment verification data" });
            }

            console.log(`\n💳 [POST /api/payments/:id/confirm]`);

            // Verify Razorpay signature
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
                .update(body)
                .digest("hex");

            if (razorpay_signature !== expectedSignature) {
                console.error("Payment signature verification failed for order:", razorpay_order_id);
                return res.status(400).json({ message: "Invalid payment signature" });
            }

            console.log(`✅ Signature verified`);

            // Verify the payment belongs to the authenticated user
            const payment = await storage.getPaymentByOrderId(razorpay_order_id);
            if (!payment) {
                return res.status(404).json({ message: "Payment not found" });
            }

            // Update payment status
            const updatedPayment = await storage.updatePaymentStatus(
                razorpay_order_id,
                "completed",
                razorpay_payment_id
            );

            console.log(`✅ Payment marked as completed`);

            // 🎯 KEY CHANGE: Update appointment status to "scheduled"
            const appointmentId = payment.appointmentId;
            const appointment = await storage.updateAppointment(appointmentId, {
                status: "scheduled",
            });

            console.log(`✅ Appointment status updated to: scheduled`);

            // Get doctor info for notification
            const doctor = await storage.getUser(appointment.doctorId);

            // Send confirmation notification to patient
            await storage.createNotification({
                recipientId: payment.patientId,
                type: "appointment_confirmed",
                title: "Payment Confirmed!",
                message: `Your appointment with Dr. ${doctor?.firstName} ${doctor?.lastName} is now confirmed.`,
                appointmentId,
                appointmentDate: appointment.appointmentDate,
                consultationFee: appointment.consultationFee,
                doctorId: appointment.doctorId,
                read: false,
                createdAt: new Date(),
                notificationChannels: ["email", "inapp"],
            });

            console.log(`✅ Confirmation notification sent to patient`);

            res.json({
                success: true,
                payment: updatedPayment,
                appointment,
                message: "Payment confirmed and appointment scheduled!",
            });
        } catch (error: any) {
            console.error("POST /api/payments/:id/confirm failed:", error);
            res.status(400).json({ message: "Payment verification failed" });
        }
    });


    // ... (rest of the routes: webhook, documents, records, admin, disputes, analytics) ...

    // Razorpay webhook for payment verification
    app.post("/api/razorpay-webhook", async (req, res) => {
        try {
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

            if (!webhookSecret) {
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

    // ==================================

app.get("/api/debug/razorpay-config", async (req, res) => {
    try {
        res.json({
            hasKeyId: !!process.env.RAZORPAY_KEY_ID,
            keyIdValue: process.env.RAZORPAY_KEY_ID ? "SET" : "NOT SET",
            hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
            keySecretValue: process.env.RAZORPAY_KEY_SECRET ? "SET" : "NOT SET",
            razorpayInitialized: !!razorpay,
            nodeEnv: process.env.NODE_ENV,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 🔍 DEBUG: Test appointment fetch
app.get("/api/debug/appointment/:id", async (req, res) => {
    try {
        const appointment = await storage.getAppointment(req.params.id);
        if (!appointment) {
            return res.json({ found: false, appointmentId: req.params.id });
        }
        res.json({
            found: true,
            appointmentId: req.params.id,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            consultationFee: appointment.consultationFee,
            status: appointment.status,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 🔍 DEBUG: Test authenticated user
app.get("/api/debug/current-user", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.json({ authenticated: false });
        }
        res.json({
            authenticated: true,
            userId: req.user!._id.toString(),
            role: req.user!.role,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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

            if (req.user!.role !== "doctor") {
                return res.status(403).json({ message: "Doctor access required" });
            }

            const documentId = req.params.id;

            console.log(`\n🗑️  [DELETE /api/doctor/documents/:id]`);

            // Get all documents for this doctor
            const allDocuments = await storage.getDoctorDocuments(req.user!._id.toString());

            // Find the specific document
            const document = allDocuments.find((doc: any) => doc._id.toString() === documentId);

            if (!document) {
                console.log(`❌ Document not found`);
                return res.status(404).json({ message: "Document not found" });
            }

            // Verify ownership
            const docDoctorId = document.doctorId instanceof Object
                ? document.doctorId.toString()
                : document.doctorId;

            if (docDoctorId !== req.user!._id.toString()) {
                console.log(`❌ Access denied - document belongs to different doctor`);
                return res.status(403).json({ message: "Access denied" });
            }

            // Delete from storage (which handles both file and DB deletion)
            console.log(`   Calling storage.deleteDoctorDocument...`);
            const deletedDoc = await storage.deleteDoctorDocument(documentId);

            if (!deletedDoc) {
                console.log(`❌ Failed to delete from storage`);
                return res.status(500).json({ message: "Failed to delete document from database" });
            }

            console.log(`✅ Document deleted successfully`);
            return res.json({ message: "Document deleted successfully", documentId });

        } catch (error: any) {
            console.error(`❌ DELETE /api/doctor/documents/:id failed:`, error.message);
            console.error(`   Stack:`, error.stack);
            res.status(500).json({ message: error.message || "Failed to delete document" });
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
                // FIX: Ensure ID is converted to string for storage
                patientId:
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
            console.log(`\n📋 [POST /api/admin/verify-doctor/:id]`);

            if (!req.isAuthenticated()) {
                console.log(`❌ Not authenticated`);
                return res.status(401).json({ message: "Authentication required" });
            }

            if (req.user!.role !== "admin") {
                console.log(`❌ Not admin. Role: ${req.user!.role}`);
                return res.status(403).json({ message: "Admin access required" });
            }

            const doctorUserId = req.params.id;
            const { approved } = req.body;

            console.log(`   doctorUserId: ${doctorUserId}`);

            // Verify this is actually a doctor
            console.log(`   🔍 Looking up doctor user...`);
            const doctor = await storage.getUser(doctorUserId);
            if (!doctor) {
                console.log(`❌ Doctor user not found`);
                return res.status(404).json({ message: "Doctor user not found" });
            }

            if (doctor.role !== 'doctor') {
                console.log(`❌ User is not a doctor. Role: ${doctor.role}`);
                return res.status(404).json({ message: "User is not a doctor" });
            }

            // Get current profile
            console.log(`   🔍 Looking up doctor profile...`);
            const currentProfile = await storage.getDoctorProfile(doctorUserId);

            // Update the doctor profile's isApproved status
            console.log(`   💾 Updating profile with isApproved=${approved}...`);
            const profile = await storage.updateDoctorProfile(doctorUserId, { isApproved: approved });

            console.log(`✅ Profile updated`);

            res.json(profile);
        } catch (error: any) {
            console.error(`\n❌ POST /api/admin/verify-doctor/:id failed:`);
            console.error(`   Error: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
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
            // If the error message is generic, we return 500
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