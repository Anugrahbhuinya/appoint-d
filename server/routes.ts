import mongoose from "mongoose";
import type { Express } from "express";
import { createServer, type Server } from "http";
import Razorpay from "razorpay";
import twilio from "twilio";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import passport from "passport";
import express from "express";
import { DoctorAvailability } from "@shared/mongodb-schema";
import crypto from "crypto";
import { format } from "date-fns";
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
import { sanitizeObjectId } from "./security-utils";
import fs from "fs/promises";
import { z } from "zod"; // <-- Ensure Zod is imported for error checking

// ========================================
// 🔧 SCALABLE IMAGE URL UTILITY
// ========================================
const getBackendBaseUrl = (): string => {
    if (process.env.BACKEND_BASE_URL) {
        return process.env.BACKEND_BASE_URL;
    }
    const port = process.env.PORT || 5000;
    return `http://localhost:${port}`;
};

const buildFullImageUrl = (
    relativePath: string | undefined
): string | undefined => {
    if (!relativePath) return undefined;
    if (
        relativePath.startsWith("http://") ||
        relativePath.startsWith("https://")
    ) {
        return relativePath;
    }
    const baseUrl = getBackendBaseUrl();
    return `${baseUrl}${relativePath}`;
};
// ========================================

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
        const extname = allowedTypes.test(
            path.extname(file.originalname).toLowerCase()
        );

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Only images and documents are allowed"));
        }
    },
});

// ... (Your other imports like multer, path, fs from 'fs/promises', etc.) ...

// DEDICATED MULTER CONFIG FOR ALL USER PROFILE PICTURES
// DEDICATED MULTER CONFIG FOR ALL USER PROFILE PICTURES
const userProfilePicUpload = multer({
    storage: multer.diskStorage({
        // FIX: Use async fs and callback pattern
        destination: (req, file, cb) => {
            const dir = path.join(
                process.cwd(),
                "public",
                "uploads",
                "user-profiles"
            ); // Use the globally imported 'fs' (from 'fs/promises')
            fs.mkdir(dir, { recursive: true })
                .then(() => {
                    cb(null, dir); // Success
                })
                .catch((err: any) => {
                    console.error("❌ Failed to create user-profiles directory:", err);
                    cb(err); // Failure
                });
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const userId = (req.user as any)?._id.toString() || "unknown";
            const filename = `profile-${userId}-${uniqueSuffix}${ext}`;
            cb(null, filename);
        },
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed (JPEG, PNG, GIF, WebP)"));
        }
    },
});

// Ensure the directory exists (initial check using async/await)
(async () => {
    try {
        await fs.mkdir("public/uploads/user-profiles", { recursive: true });
        console.log("✅ User profiles upload directory ready");
    } catch (error) {
        console.error(
            "❌ Failed to create user upload directory during boot:",
            error
        );
    }
})();

// NEW MULTER CONFIG FOR DOCTOR PROFILE PICTURES
const profilePicUpload = multer({
    storage: multer.diskStorage({
        // FIX: Use async fs and callback pattern
        destination: (req, file, cb) => {
            const dir = path.join(
                process.cwd(),
                "public",
                "uploads",
                "doctor-profiles"
            ); // Use the globally imported 'fs' (from 'fs/promises')
            fs.mkdir(dir, { recursive: true })
                .then(() => {
                    cb(null, dir); // Success
                })
                .catch((err: any) => {
                    console.error("❌ Failed to create doctor-profiles directory:", err);
                    cb(err); // Failure
                });
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            console.log("File extension:", ext);

            let finalExt = ext;
            if (!finalExt) {
                const mimeToExt: { [key: string]: string } = {
                    "image/jpeg": ".jpg",
                    "image/png": ".png",
                    "image/gif": ".gif",
                    "image/webp": ".webp",
                };
                finalExt = mimeToExt[file.mimetype] || ".jpg";
                console.log("Inferred extension:", finalExt);
            }

            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const filename = `${uniqueSuffix}${finalExt}`;

            console.log("Final filename:", filename);
            cb(null, filename);
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req, file, cb) => {
        console.log("📸 [Multer fileFilter] Checking file:", {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        });

        const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

        if (allowedMimes.includes(file.mimetype)) {
            console.log("  ✅ File allowed");
            cb(null, true);
        } else {
            console.log("  ❌ File rejected - invalid MIME type");
            cb(new Error("Only image files are allowed (JPEG, PNG, GIF, WebP)"));
        }
    },
});

// Ensure uploads directory exists for doctor profiles
(async () => {
    try {
        await fs.mkdir("public/uploads/doctor-profiles", { recursive: true });
        console.log("✅ Doctor profiles upload directory ready");
    } catch (error) {
        console.error("❌ Failed to create upload directory during boot:", error);
    }
})();
// END NEW MULTER CONFIG

// Ensure uploads directory exists for doctor profiles (Duplicate, keeping for robustness during transition)
(async () => {
    try {
        await fs.mkdir("public/uploads/doctor-profiles", { recursive: true });
        console.log("✅ Doctor profiles upload directory ready");
    } catch (error) {
        console.error("❌ Failed to create upload directory:", error);
    }
})();
// END NEW MULTER CONFIG

const convertIsoToJsDay = (isoDay: number): number => {
    // ISO: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
    // JS:  1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
    if (isoDay < 1 || isoDay > 7) {
        throw new Error("dayOfWeek must be ISO format (1-7)");
    }
    return isoDay === 7 ? 0 : isoDay;
};

const convertJsDayToIso = (jsDay: number): number => {
    return jsDay === 0 ? 7 : jsDay;
};

export async function registerRoutes(app: Express): Promise<Server> {
    setupAuth(app); // Debug: Connection info

    app.get("/api/debug/connection-info", async (req, res) => {
        try {
            const connection = mongoose.connection;
            const collections = await connection.db.listCollections().toArray();

            res.json({
                databaseName: connection.name,
                collections: collections.map((c: any) => c.name),
                userCount: await connection.collection("users").countDocuments(),
                doctorCount: await connection
                    .collection("users")
                    .countDocuments({ role: "doctor" }),
                profileCount: await connection
                    .collection("doctorprofiles")
                    .countDocuments(),
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }); // Debug: Get raw doctors

    app.get("/api/debug/raw-doctors", async (req, res) => {
        try {
            const doctors = await storage.getUsersByRole("doctor");
            res.json({
                count: doctors.length,
                doctors: doctors.map((d: any) => ({
                    _id: d._id.toString(),
                    firstName: d.firstName,
                    lastName: d.lastName,
                    email: d.email,
                })),
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }); // Debug: Get raw profiles

    app.get("/api/debug/raw-profiles", async (req, res) => {
        try {
            const profiles = await storage.getDoctorProfiles();
            res.json({
                count: profiles.length,
                profiles: profiles.map((p: any) => ({
                    _id: p._id.toString(),
                    userId:
                        p.userId instanceof mongoose.Types.ObjectId
                            ? p.userId.toString()
                            : p.userId,
                    specialization: p.specialization,
                    isApproved: p.isApproved,
                })),
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }); // Debug: Test getDoctorsWithProfiles

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
                    isApproved: d.profile?.isApproved,
                })),
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    }); // === STATIC FILE SERVING FOR DOWNLOADS ===

    app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
    app.use(
        "/uploads",
        express.static(path.join(process.cwd(), "public", "uploads"))
    ); // ========================================= // === AUTHENTICATION ROUTES ===
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
            res.status(400).json({
                message: error.message || "Registration failed due to invalid data.",
            });
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
            res
                .status(500)
                .json({ message: "Internal Server Error during user retrieval." });
        }
    }); // ======================================================== // === PROFILE PICTURE UPLOAD (FIXED: Uses global Multer middleware) ===
    app.post(
        "/api/upload/profile-picture",
        userProfilePicUpload.single("image"),
        async (req, res) => {
            try {
                console.log("\n📸 [POST /api/upload/profile-picture] START (FIXED)");

                if (!req.isAuthenticated()) {
                    console.log("❌ Not authenticated"); // Although Multer has run, we prevent database changes if not authenticated
                    return res.status(401).json({ message: "Authentication required" });
                }

                const userId = req.user!._id.toString(); // Multer handled file errors and storing the file

                if (!req.file) {
                    console.log("❌ No file uploaded"); // NOTE: If Multer hit a size/type limit, it would already have been caught as a 400 error via the error handler.
                    return res.status(400).json({ message: "No image file provided" });
                } // The destination directory must match the one defined in userProfilePicUpload

                const relativePath = `/uploads/user-profiles/${req.file.filename}`;

                console.log("✅ File received and stored:", relativePath); // --- File Cleanup (Recommended for storage efficiency) ---

                const oldUser = await storage.getUser(userId);
                const oldPicturePath = oldUser?.profilePicture;

                if (oldPicturePath && oldPicturePath !== relativePath) {
                    // Construct full local path: assumes old path starts with /uploads/
                    const oldFilePath = path.join(
                        process.cwd(),
                        "public",
                        oldPicturePath
                    );
                    try {
                        // Use the async fs/promises import
                        await fs.unlink(oldFilePath);
                        console.log(`🗑️ Deleted old picture: ${oldFilePath}`);
                    } catch (e: any) {
                        // Ignore deletion errors (file not found, permissions, etc.)
                        console.warn(
                            `⚠️ Could not delete old file at ${oldFilePath}. Skipping cleanup.`,
                            e.message
                        );
                    }
                } // --- End Cleanup --- // Update user with the new relative file path
                const updatedUser = await storage.updateUser(userId, {
                    profilePicture: relativePath,
                });

                console.log("✅ User profile updated in DB"); // Return the full, scalable URL to the client

                res.json({
                    success: true,
                    profilePicture: buildFullImageUrl(relativePath), // <-- This generates the full http://... link
                    filename: req.file.filename,
                    message: "Profile picture uploaded successfully",
                });
            } catch (error: any) {
                // This block catches errors during DB update or file cleanup
                console.error("❌ Error in fixed profile picture upload:", error);
                res.status(500).json({
                    message: error.message || "Failed to upload profile picture",
                });
            }
        }
    );

    // ========================================
    // GET PATIENT RECORDS LIST (CORRECTED POSITION: MUST BE BEFORE :patientId)
    // ========================================
    app.get("/api/patient/records", async (req, res) => {
        try {
            console.log("🔍 [GET /api/patient/records] DEBUG");
            console.log("    User authenticated:", req.isAuthenticated());
            console.log("    User role:", req.user?.role);
            console.log("    User ID:", req.user?._id);

            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const patientId =
                req.user!.role === "patient"
                    ? req.user!._id.toString()
                    : (req.query.patientId as string);
            console.log("    PatientId being used:", patientId);
            if (!patientId) {
                return res.status(400).json({ message: "Patient ID required" });
            }

            const records = await storage.getPatientRecords(patientId);
            console.log("    Records returned:", records.length);
            res.json(records);
        } catch (error: any) {
            console.error("GET /api/patient/records failed:", error);
            res.status(500).json({ message: error.message });
        }
    });

    app.delete("/api/patient/records/:id", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const recordId = req.params.id;
            const patientId = req.user!._id.toString();

            // Get the record first to verify ownership
            const record = await storage.getPatientRecords(patientId);
            const targetRecord = record.find(
                (r: any) => r._id.toString() === recordId
            );

            if (!targetRecord) {
                return res.status(404).json({ message: "Record not found" });
            }

            // Verify ownership
            if (targetRecord.patientId !== patientId) {
                return res.status(403).json({ message: "Access denied" });
            }

            // Delete the file if it exists
            if (targetRecord.filePath) {
                try {
                    await fs.unlink(targetRecord.filePath);
                    console.log(`🗑️ Physical file deleted: ${targetRecord.filePath}`);
                } catch (error) {
                    console.warn(`⚠️ Could not delete physical file:`, error);
                }
            }

            // Delete from database
            await storage.deletePatientRecord(recordId);

            console.log(`✅ Record deleted: ${recordId}`);
            res.json({ message: "Record deleted successfully" });
        } catch (error: any) {
            console.error("DELETE /api/patient/records/:id failed:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // ========================================
    // GET PATIENT PROFILE (For Doctors)
    // ========================================
    // Allow doctors to view patient profile including picture
    app.get("/api/patient/:patientId", async (req, res) => {
        try {
            console.log(`\n👤 [GET /api/patient/:patientId]`);

            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            } // Only doctors and admins can view patient profiles

            if (req.user!.role !== "doctor" && req.user!.role !== "admin") {
                return res.status(403).json({ message: "Access denied" });
            }

            const patientId = sanitizeObjectId(req.params.patientId, "patient ID");

            const patient = await storage.getUser(patientId);

            if (!patient || patient.role !== "patient") {
                return res.status(404).json({ message: "Patient not found" });
            } // Check if doctor has appointment with this patient

            if (req.user!.role === "doctor") {
                const doctorId = req.user!._id.toString();
                const doctorAppointments = await storage.getAppointmentsByDoctor(
                    doctorId
                );
                const hasAppointment = doctorAppointments.some(
                    (apt: any) => apt.patientId === patientId
                );

                if (!hasAppointment) {
                    console.log(
                        `⚠️ Doctor ${doctorId} has no appointments with patient ${patientId}`
                    );
                    return res.status(403).json({
                        message:
                            "You can only view patient profiles for patients you have appointments with",
                    });
                }

                console.log(`✅ Doctor has appointment with patient`);
            } // Return patient profile with full image URL

            const patientObj = patient.toObject ? patient.toObject() : patient;
            if (patientObj.profilePicture) {
                patientObj.profilePicture = buildFullImageUrl(
                    patientObj.profilePicture
                );
            }

            console.log(`✅ Patient profile retrieved`);

            res.json(patientObj);
        } catch (error: any) {
            console.error("❌ GET /api/patient/:patientId failed:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // ========================================
    // GET PATIENT PROFILE PICTURE (Direct Access)
    // ========================================
    // Allow doctors to fetch just the patient's profile picture
    app.get("/api/patient/:patientId/profile-picture", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const patientId = sanitizeObjectId(req.params.patientId, "patient ID");
            const patient = await storage.getUser(patientId);

            if (!patient || patient.role !== "patient") {
                return res.status(404).json({ message: "Patient not found" });
            } // Verify access

            if (req.user!.role === "doctor") {
                const doctorAppointments = await storage.getAppointmentsByDoctor(
                    req.user!._id.toString()
                );
                const hasAppointment = doctorAppointments.some(
                    (apt: any) => apt.patientId === patientId
                );

                if (!hasAppointment) {
                    return res.status(403).json({ message: "Access denied" });
                }
            }

            const profilePictureUrl = patient.profilePicture
                ? buildFullImageUrl(patient.profilePicture)
                : null;

            res.json({
                patientId: patientId,
                profilePicture: profilePictureUrl,
                firstName: patient.firstName,
                lastName: patient.lastName,
            });
        } catch (error: any) {
            console.error(
                "❌ GET /api/patient/:patientId/profile-picture failed:",
                error
            );
            res.status(500).json({ message: error.message });
        }
    });

    // ========================================
    // UPDATE PATIENT PROFILE (For Patients)
    // ========================================
    app.put("/api/user/profile", async (req, res) => {
        try {
            console.log("\n✏️ [PUT /api/user/profile] UPDATING FIELDS");

            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const userId = req.user!._id.toString(); // Only allow patients to update their own profile

            if (req.user!.role !== "patient") {
                return res
                    .status(403)
                    .json({ message: "Only patients can update their profile" });
            } // Destructure all expected fields from req.body

            const {
                firstName,
                lastName,
                email,
                phone,
                dateOfBirth,
                gender,
                bloodGroup,
                address,
                emergencyContact,
                medicalHistory,
                allergies,
                currentMedications,
            } = req.body; // Prepare the updates object

            const updates: any = {}; // --- Basic Fields ---

            if (firstName !== undefined) updates.firstName = firstName;
            if (lastName !== undefined) updates.lastName = lastName;
            if (phone !== undefined) updates.phone = phone;
            if (email !== undefined) updates.email = email; // --- Date of Birth (CRITICAL CONVERSION) ---
            if (dateOfBirth) {
                const dateObj = new Date(dateOfBirth);
                if (!isNaN(dateObj.getTime())) {
                    updates.dateOfBirth = dateObj;
                } else {
                    console.warn(
                        `⚠️ Invalid dateOfBirth value received: ${dateOfBirth}. Skipping update for this field.`
                    );
                }
            } else if (dateOfBirth === "") {
                updates.dateOfBirth = undefined;
            } // --- Other Fields ---
            if (gender !== undefined) updates.gender = gender;
            if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
            if (address !== undefined) updates.address = address;
            if (emergencyContact !== undefined)
                updates.emergencyContact = emergencyContact; // --- Medical Fields ---

            if (medicalHistory !== undefined) updates.medicalHistory = medicalHistory;
            if (allergies !== undefined) updates.allergies = allergies;
            if (currentMedications !== undefined)
                updates.currentMedications = currentMedications; // Check if any actual update data was successfully prepared
            if (Object.keys(updates).length === 0) {
                console.log(
                    "⚠️ No valid update fields received. Returning current user."
                );
                const freshUser = await storage.getUser(userId);
                if (freshUser) {
                    const userObj = freshUser.toObject ? freshUser.toObject() : freshUser;
                    if (userObj.profilePicture) {
                        userObj.profilePicture = buildFullImageUrl(userObj.profilePicture);
                    }
                    return res.status(200).json(userObj);
                }
                return res.status(200).json(req.user);
            } // Call the storage function
            const updatedUser = await storage.updateUser(userId, updates);

            console.log(
                "✅ Patient profile updated in database. Fields updated:",
                Object.keys(updates)
            );

            const userObj = updatedUser.toObject
                ? updatedUser.toObject()
                : updatedUser; // 🔥 CRITICAL FIX: Explicitly ensure all profile fields are in the response
            const responseData = {
                _id: userObj._id,
                username: userObj.username,
                email: userObj.email,
                role: userObj.role,
                isVerified: userObj.isVerified,
                isActive: userObj.isActive,
                profilePicture: userObj.profilePicture
                    ? buildFullImageUrl(userObj.profilePicture)
                    : undefined, // ✅ PROFILE FIELDS - Explicitly include all of them
                firstName: userObj.firstName || "",
                lastName: userObj.lastName || "",
                phone: userObj.phone || "",
                dateOfBirth: userObj.dateOfBirth || null,
                gender: userObj.gender || "",
                bloodGroup: userObj.bloodGroup || "",
                address: userObj.address || "",
                emergencyContact: userObj.emergencyContact || "",
                medicalHistory: userObj.medicalHistory || "",
                allergies: userObj.allergies || "",
                currentMedications: userObj.currentMedications || "",
                createdAt: userObj.createdAt,
                updatedAt: userObj.updatedAt,
            };
            console.log("📤 Returning response with all fields:", {
                firstName: responseData.firstName,
                lastName: responseData.lastName,
                dateOfBirth: responseData.dateOfBirth,
                gender: responseData.gender,
                bloodGroup: responseData.bloodGroup,
                address: responseData.address,
                emergencyContact: responseData.emergencyContact,
            });
            res.json(responseData);
        } catch (error: any) {
            console.error("❌ PUT /api/user/profile failed:", error);
            res
                .status(400)
                .json({
                    message: error.message || "Update failed due to invalid data.",
                });
        }
    });

    // ========================================
    // GET DOCTOR'S PATIENTS (For Appointments)
    // ========================================
    // Allow doctors to see list of patients they have appointments with
    app.get("/api/doctor/patients", async (req, res) => {
        try {
            console.log("\n👥 [GET /api/doctor/patients]");

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res
                    .status(401)
                    .json({ message: "Authentication required or not a doctor" });
            }

            const doctorId = req.user!._id.toString(); // Get all appointments for this doctor

            const appointments = await storage.getAppointmentsByDoctor(doctorId); // Extract unique patient IDs

            const patientIds = [
                ...new Set(appointments.map((apt: any) => apt.patientId)),
            ];

            console.log(`Found ${patientIds.length} unique patients`); // Fetch patient details

            const patients = await Promise.all(
                patientIds.map(async (patientId: string) => {
                    const patient = await storage.getUser(patientId);
                    if (!patient) return null;

                    const patientObj = patient.toObject ? patient.toObject() : patient;

                    if (patientObj.profilePicture) {
                        patientObj.profilePicture = buildFullImageUrl(
                            patientObj.profilePicture
                        );
                    } // Count appointments

                    const patientAppointments = appointments.filter(
                        (apt: any) => apt.patientId === patientId
                    );

                    return {
                        ...patientObj,
                        appointmentCount: patientAppointments.length,
                        lastAppointment:
                            patientAppointments[patientAppointments.length - 1],
                    };
                })
            );

            const validPatients = patients.filter(Boolean);

            console.log(`✅ Fetched ${validPatients.length} patient profiles`);

            res.json(validPatients);
        } catch (error: any) {
            console.error("❌ GET /api/doctor/patients failed:", error);
            res.status(500).json({ message: error.message });
        }
    }); // ======================================================== // -------------------------------------------------------- // === NEW DOCTOR PROFILE ROUTES WITH FILE UPLOAD === // -------------------------------------------------------- // POST /api/doctor/profile - Create profile with picture
    app.post("/api/doctor/profile", async (req, res) => {
        try {
            console.log("\n====== [POST /api/doctor/profile] ======");

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
                console.log(
                    "📸 Profile picture: " +
                        (profilePicture.length / 1024).toFixed(2) +
                        " KB"
                );
            }

            let parsedQualifications: string[] = [];
            if (qualifications) {
                try {
                    parsedQualifications =
                        typeof qualifications === "string"
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
                bio: bio || "",
                qualifications: parsedQualifications,
                hospitalAffiliation: hospitalAffiliation || "",
                licenseNumber: licenseNumber || "",
                isApproved: false,
                rating: 0,
                totalReviews: 0,
            });

            const profile = await storage.createDoctorProfile(validatedData);

            if (profilePicture) {
                const updatedProfile = await storage.updateDoctorProfile(userId, {
                    profilePicture,
                });
                console.log("✅ Profile created with picture"); // ⭐ ADDED LINE - Convert to full URL before returning
                const profileObj = updatedProfile.toObject
                    ? updatedProfile.toObject()
                    : updatedProfile;
                profileObj.profilePicture = buildFullImageUrl(
                    profileObj.profilePicture
                );
                return res.status(201).json(profileObj);
            }

            console.log("✅ Profile created without picture");
            res.status(201).json(profile);
        } catch (error: any) {
            console.error("POST /api/doctor/profile failed:", error);
            res
                .status(400)
                .json({ message: error.message || "Failed to create doctor profile" });
        }
    }); // ⭐ CHANGED: Added buildFullImageUrl to profile picture response

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

            const profileObj = profile.toObject ? profile.toObject() : profile; // ⭐ DEBUG LOGS
            console.log("📸 Profile picture from DB:", profileObj.profilePicture); // ⭐ Convert profile picture to full URL
            profileObj.profilePicture = buildFullImageUrl(profileObj.profilePicture);
            console.log(
                "📸 Profile picture after buildFullImageUrl:",
                profileObj.profilePicture
            );

            res.json(profileObj);
        } catch (error: any) {
            console.error("GET /api/doctor/profile failed:", error);
            res.status(500).json({ message: error.message });
        }
    }); //profile debug routes

    app.get("/api/debug/uploads", async (req, res) => {
        try {
            const uploadsPath = path.join(
                process.cwd(),
                "public",
                "uploads",
                "doctor-profiles"
            );
            const exists = await fs
                .stat(uploadsPath)
                .then(() => true)
                .catch(() => false);

            let files: string[] = [];
            if (exists) {
                files = await fs.readdir(uploadsPath);
            }

            res.json({
                uploadsPath,
                exists,
                files: files.slice(0, 10), // First 10 files
                fileCount: files.length,
                serverUrl: `${req.protocol}://${req.hostname}:${
                    req.socket.localPort || 5000
                }`,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }); // PUT /api/doctor/profile - Update profile with actual file storage // ⭐ CHANGED: Updated the profilePicture assignment to use buildFullImageUrl
    app.put("/api/doctor/profile", async (req, res) => {
        try {
            console.log("\n====== [PUT /api/doctor/profile] ======");
            console.log("Body keys:", Object.keys(req.body));

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
                profilePicture, // Base64 data URL from frontend
            } = req.body;

            let parsedQualifications = currentProfile.qualifications;
            if (qualifications) {
                try {
                    parsedQualifications =
                        typeof qualifications === "string"
                            ? JSON.parse(qualifications)
                            : qualifications;
                } catch (e) {
                    console.error("Failed to parse qualifications:", e);
                }
            }

            const updates: any = {
                specialization: specialization || currentProfile.specialization,
                experience: experience
                    ? parseInt(experience)
                    : currentProfile.experience,
                consultationFee: consultationFee
                    ? parseFloat(consultationFee)
                    : currentProfile.consultationFee,
                bio: bio || currentProfile.bio,
                qualifications: parsedQualifications,
                hospitalAffiliation:
                    hospitalAffiliation || currentProfile.hospitalAffiliation,
                licenseNumber: licenseNumber || currentProfile.licenseNumber,
                gender: req.body.gender || currentProfile.gender,
                clinicAddress: req.body.clinicAddress || currentProfile.clinicAddress,
            }; // ⭐ START: SCALABLE PROFILE PICTURE HANDLING LOGIC
            if (profilePicture && profilePicture.startsWith("data:")) {
                // 1. Decode Base64 to file
                const parts = profilePicture.split(";");
                const mimeType = parts[0].split(":")[1];
                const base64Data = parts[1].split(",")[1];
                const extension =
                    mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
                const filename = `${userId}_profile_${Date.now()}.${extension}`; // Set the path where Express serves files from (needs to be public)
                const localDir = path.join(
                    process.cwd(),
                    "public",
                    "uploads",
                    "doctor-profiles"
                );
                const filePath = path.join(localDir, filename); // Write the buffer to the local disk asynchronously

                await fs.writeFile(filePath, base64Data, "base64");
                console.log(`✅ Profile picture saved to disk: ${filePath}`); // 2. Save the public URL path to the database

                updates.profilePicture = buildFullImageUrl(
                    `/uploads/doctor-profiles/${filename}`
                );
                console.log("✅ Profile picture saved as public URL path.");
            } else if (req.body.profilePicture === "") {
                // Handle explicit removal of profile picture (clearing the field)
                updates.profilePicture = undefined;
            } else if (profilePicture) {
                // If profilePicture exists but isn't a new Base64 string (i.e., it's an existing file path), keep it.
                updates.profilePicture = profilePicture;
            } // ⭐ END: SCALABLE PROFILE PICTURE HANDLING LOGIC
            console.log("💾 Updating profile in database...");
            const updatedProfile = await storage.updateDoctorProfile(userId, updates);

            console.log("✅ Profile updated successfully");
            console.log(
                "     Picture stored: " + (updatedProfile.profilePicture ? "Yes" : "No")
            );
            console.log("=====================================\n");

            res.json(updatedProfile);
        } catch (error: any) {
            console.error("❌ Error updating profile:", error.message);
            console.error("Stack:", error.stack);
            res
                .status(400)
                .json({ message: error.message || "Failed to update doctor profile" });
        }
    }); // POST /api/doctor/profile/picture/remove - Remove profile picture

    app.post("/api/doctor/profile/picture/remove", async (req, res) => {
        try {
            console.log("\n====== [POST /api/doctor/profile/picture/remove] ======");

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
                return res
                    .status(400)
                    .json({ message: "No profile picture to delete" });
            }

            console.log("🗑️ Removing profile picture..."); // Update profile to remove picture

            const updatedProfile = await storage.updateDoctorProfile(userId, {
                profilePicture: undefined,
            });

            console.log("✅ Profile picture removed");
            console.log("=====================================\n");

            res.json(updatedProfile);
        } catch (error: any) {
            console.error("❌ Error removing picture:", error.message);
            res
                .status(400)
                .json({ message: error.message || "Failed to remove profile picture" });
        }
    }); // DELETE /api/doctor/profile/picture - Delete profile picture

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
                return res
                    .status(400)
                    .json({ message: "No profile picture to delete" });
            } // Delete file from storage

            const picPath = path.join(
                process.cwd(),
                "public",
                profile.profilePicture
            );
            try {
                await fs.unlink(picPath);
                console.log("✅ Deleted profile picture:", picPath);
            } catch (error) {
                console.warn("⚠️ Could not delete profile picture file:", error);
            } // Update profile to remove picture URL

            const updatedProfile = await storage.updateDoctorProfile(userId, {
                profilePicture: undefined,
            });

            res.json(updatedProfile);
        } catch (error: any) {
            console.error("DELETE /api/doctor/profile/picture failed:", error);
            res
                .status(500)
                .json({ message: error.message || "Failed to delete profile picture" });
        }
    }); // -------------------------------------------------------- // === END NEW DOCTOR PROFILE ROUTES === // -------------------------------------------------------- // Doctor Search Routes // ⭐ CHANGED: Added buildFullImageUrl to profile picture response

    app.get("/api/doctors", async (req, res) => {
        try {
            console.log("\n🏥 [GET /api/doctors] REQUEST");

            const doctors = await storage.getDoctorsWithProfiles();

            console.log(`✅ Retrieved ${doctors.length} doctors`); // Convert to plain objects before sending

            const plainDoctors = doctors.map((doc: any) => ({
                _id: doc._id?.toString?.() || doc._id,
                firstName: doc.firstName,
                lastName: doc.lastName,
                email: doc.email,
                role: doc.role,
                profile: doc.profile
                    ? {
                          _id: doc.profile._id?.toString?.() || doc.profile._id,
                          specialization: doc.profile.specialization,
                          experience: doc.profile.experience,
                          consultationFee: doc.profile.consultationFee,
                          bio: doc.profile.bio,
                          isApproved: doc.profile.isApproved,
                          rating: doc.profile.rating,
                          profilePicture: buildFullImageUrl(doc.profile.profilePicture), // ⭐ ADDED THIS
                      }
                    : null,
            }));

            console.log(`📝 Converted to plain objects:`, plainDoctors);

            res.status(200).json(plainDoctors);
        } catch (error: any) {
            console.error("❌ ERROR:", error);
            res.status(500).json({ message: error.message });
        }
    }); // ⭐ CHANGED: Added buildFullImageUrl to profile picture response

    app.get("/api/doctors/:id", async (req, res) => {
        try {
            // Sanitize and validate the doctor ID
            const doctorId = sanitizeObjectId(req.params.id, "doctor ID");

            const doctor = await storage.getUser(doctorId);
            if (!doctor || doctor.role !== "doctor") {
                return res.status(404).json({ message: "Doctor not found" });
            }

            const profile = await storage.getDoctorProfile(doctor._id.toString());
            if (!profile) {
                return res.status(404).json({ message: "Doctor profile not found" });
            } // FIX: Ensure both objects are plain JS objects when combining

            const docObj = doctor.toObject();
            const profileObj = profile.toObject(); // ⭐ ADDED THIS: Convert profile picture to full URL
            profileObj.profilePicture = buildFullImageUrl(profileObj.profilePicture);

            res.json({ ...docObj, profile: profileObj });
        } catch (error: any) {
            console.error("GET /api/doctors/:id failed:", error);
            res.status(500).json({ message: error.message });
        }
    }); // =========================== // DOCTOR AVAILABILITY ROUTES // ===========================

    app.post("/api/doctor/availability", async (req, res) => {
        try {
            console.log("📝 [POST /api/doctor/availability]");

            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            if (req.user!.role !== "doctor") {
                return res.status(403).json({ message: "Doctor access required" });
            }

            let incomingDay = req.body.dayOfWeek as number | undefined;
            let normalizedDate: string | undefined;

            if (req.body.specificDate) {
                const parsedDate = new Date(req.body.specificDate);
                if (Number.isNaN(parsedDate.getTime())) {
                    return res.status(400).json({ message: "Invalid specificDate" });
                }
                normalizedDate = format(parsedDate, "yyyy-MM-dd");
                incomingDay = convertJsDayToIso(parsedDate.getDay());
            }

            if (
                incomingDay === undefined ||
                incomingDay === null ||
                incomingDay < 1 ||
                incomingDay > 7
            ) {
                return res.status(400).json({
                    message: "dayOfWeek must be ISO format (1-7) or provide specificDate",
                });
            }

            console.log(
                "    Incoming day (ISO):",
                incomingDay,
                "specificDate:",
                normalizedDate
            );

            const availabilityData = insertDoctorAvailabilitySchema.parse({
                ...req.body,
                dayOfWeek: convertIsoToJsDay(incomingDay), // Convert ISO (1-7) to JS (0-6) for storage
                specificDate: normalizedDate ?? req.body.specificDate,
                doctorId: req.user!._id.toString(),
            });

            console.log("    Parsed data with JS day:", availabilityData.dayOfWeek);

            const availability = await storage.createDoctorAvailability(
                availabilityData
            );

            console.log("    Created availability:", availability); // 🛑 FIX: Check if toObject exists before calling (for safety)

            const obj = availability.toObject
                ? availability.toObject()
                : availability; // Convert back to ISO for response

            const response = {
                ...obj,
                dayOfWeek: convertJsDayToIso(obj.dayOfWeek),
            };

            console.log("    Returning response with ISO day:", response.dayOfWeek);
            res.status(201).json(response);
        } catch (error: any) {
            console.error("❌ POST /api/doctor/availability failed:", error);
            console.error("    Stack:", error.stack);
            res.status(400).json({ message: error.message });
        }
    });

    app.get("/api/doctor/availability", async (req, res) => {
    try {
        console.log("📖 [GET /api/doctor/availability]");

        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // Extract parameters
        const dateParam = req.query.date as string | undefined;
        const dayOfWeekParam = req.query.dayOfWeek as string | undefined;

        // Determine doctorId
        let doctorId: string;
        if (req.user!.role === "doctor") {
            doctorId = req.user!._id.toString();
            console.log("    Doctor viewing own availability");
        } else {
            doctorId = req.query.doctorId as string;
            if (!doctorId) {
                return res.status(400).json({ 
                    message: "doctorId is required for non-doctors" 
                });
            }
            console.log("    Non-doctor querying doctor:", doctorId);
        }

        let availability: any[];

        // Fetch based on query parameters
        if (dateParam) {
            console.log("    Date-specific query:", dateParam);
            availability = await (storage as any).getDoctorAvailabilityByDate(
                doctorId,
                dateParam
            );
        } else if (dayOfWeekParam) {
            const isoDayOfWeek = parseInt(dayOfWeekParam, 10);

            if (isNaN(isoDayOfWeek) || isoDayOfWeek < 1 || isoDayOfWeek > 7) {
                return res.status(400).json({ 
                    message: "dayOfWeek must be ISO format (1-7)" 
                });
            }

            console.log("    Single day query - ISO day:", isoDayOfWeek);
            availability = await storage.getDoctorAvailability(doctorId, isoDayOfWeek);
            console.log("    Got", availability.length, "slots from storage");
        } else {
            console.log("    All days query");
            availability = await (storage as any).getAllDoctorAvailability(doctorId);
            console.log("    Got", availability.length, "total slots from storage");
        }

        // ✅ Convert dayOfWeek from JS format (0-6) to ISO format (1-7) for response
        const responseAvailability = availability.map((slot: any) => ({
            ...slot,
            dayOfWeek: convertJsDayToIso(slot.dayOfWeek),
        }));

        console.log("    Response data sample:", responseAvailability[0]);
        res.json(responseAvailability);
    } catch (error: any) {
        console.error("❌ GET /api/doctor/availability failed:", error);
        console.error("    Stack:", error.stack);
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

            const updates: any = { ...req.body };
            if (updates.dayOfWeek !== undefined) {
                if (updates.dayOfWeek < 1 || updates.dayOfWeek > 7) {
                    return res
                        .status(400)
                        .json({ message: "dayOfWeek must be ISO format (1-7)" });
                }
                updates.dayOfWeek = convertIsoToJsDay(updates.dayOfWeek);
            }

            if (updates.specificDate) {
                const parsedDate = new Date(updates.specificDate);
                if (Number.isNaN(parsedDate.getTime())) {
                    return res.status(400).json({ message: "Invalid specificDate" });
                }
                updates.specificDate = format(parsedDate, "yyyy-MM-dd");
                if (updates.dayOfWeek === undefined) {
                    updates.dayOfWeek = parsedDate.getDay();
                }
            } // Use storage layer: it handles update logic

            const availability = await storage.updateDoctorAvailability(
                req.params.id,
                updates
            ); // ✅ Storage now returns plain object (with .lean()), so no need to call toObject()

            res.json(availability);
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
    }); // =================================== // APPOINTMENT ROUTES // =================================== // Modified POST /api/appointments route
    app.post("/api/appointments", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const patientId = req.user!._id.toString(); // 🎯 CRITICAL STEP: Validate and transform the request body using Zod

            const validatedData = insertAppointmentSchema.parse({
                ...req.body,
                patientId: patientId, // Inject the authenticated patientId
            }); // Create the appointment using the fully validated and type-safe data

            const newAppointment = await storage.createAppointment({
                patientId: validatedData.patientId,
                doctorId: validatedData.doctorId,
                appointmentDate: validatedData.appointmentDate, // This is now a valid Date object
                duration: 30, // Assuming a default/fixed duration
                type: validatedData.type,
                status: "pending", // New initial status is 'pending'
                consultationFee: validatedData.consultationFee,
                notes: validatedData.notes || "",
            });

            console.log(
                `✅ Appointment created with status 'pending': ${newAppointment._id}`
            ); // Respond with success

            return res.status(201).json(newAppointment);
        } catch (error: any) {
            console.error("❌ Error booking appointment:", error); // ✅ IMPROVED ERROR HANDLING: Catch Zod validation errors (400)

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    message: "Invalid data provided for appointment",
                    errors: error.errors,
                });
            } // Catch all other unhandled database/server errors (500)

            return res
                .status(500)
                .json({ message: "Internal server error during appointment booking" });
        }
    }); // ⭐ CHANGED: Added buildFullImageUrl for doctor profile picture in enriched response // ⭐ This block handles the patient fetching their list of appointments.

    app.get("/api/appointments", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const userId = req.user!._id.toString();
            let rawAppointments;

            if (req.user!.role === "patient") {
                console.log(
                    `\n📅 [GET /api/appointments] Fetching for patient: ${userId}`
                ); // 1. Fetch raw appointments for the patient
                rawAppointments = await storage.getAppointmentsByPatient(userId); // 2. Enrich appointments with Doctor details (CRITICAL STEP)

                const enrichedAppointments = await Promise.all(
                    rawAppointments.map(async (apt: any) => {
                        // Fetch Doctor User and Profile
                        const doctorUser = await storage.getUser(apt.doctorId);
                        const doctorProfile = await storage.getDoctorProfile(apt.doctorId); // Combine and return the enriched object

                        return {
                            ...apt.toObject(), // Convert Mongoose document to plain object
                            doctor: {
                                _id: doctorUser?._id,
                                firstName: doctorUser?.firstName,
                                lastName: doctorUser?.lastName, // The profilePicture path is on the doctorProfile object:
                                profilePicture: buildFullImageUrl(
                                    doctorProfile?.profilePicture
                                ), // ⭐ THIS LINE IS THE KEY
                                specialization: doctorProfile?.specialization,
                                consultationFee: doctorProfile?.consultationFee,
                            },
                        };
                    })
                );

                console.log(
                    `✅ Fetched and enriched ${enrichedAppointments.length} appointments for patient.`
                );
                return res.json(enrichedAppointments);
            } else if (req.user!.role === "doctor") {
                // Doctor fetch logic (can remain simple if frontend handles enrichment)
                rawAppointments = await storage.getAppointmentsByDoctor(userId);
            } else if (req.user!.role === "admin") {
                rawAppointments = await storage.getAllAppointments();
            } else {
                return res.status(403).json({ message: "Access denied" });
            } // Return raw data for Doctor/Admin if not using the patient enrichment flow

            res.json(rawAppointments);
        } catch (error: any) {
            console.error("❌ GET /api/appointments failed:", error);
            res.status(500).json({ message: error.message });
        }
    });


    

    app.get("/api/appointments/:id", async (req, res) => {
    try {
        console.log(`\n📋 [GET /api/appointments/:id] Fetching single appointment`);
        console.log(`     Appointment ID: ${req.params.id}`);

        if (!req.isAuthenticated()) {
            console.log("❌ Not authenticated");
            return res.status(401).json({ message: "Authentication required" });
        }

        const appointmentId = req.params.id;

        if (!appointmentId || appointmentId === "undefined" || appointmentId.length < 24) {
            console.log("❌ Invalid appointment ID format or too short");
            return res.status(400).json({ 
                message: "Invalid appointment ID",
                receivedId: appointmentId
            });
        }
        
        // --- LOG THE ATTEMPTED DATABASE ID ---
        console.log(`     Attempting DB lookup for ID: ${appointmentId}`); 
        // --- END LOG ---

        const appointment = await storage.getAppointment(appointmentId);

        if (!appointment) {
            console.log(`❌ Appointment ${appointmentId} not found in DB`);
            return res.status(404).json({ 
                message: "Appointment not found",
                appointmentId: appointmentId
            });
        }

        const userId = req.user!._id.toString();
        const isDoctor = appointment.doctorId === userId;
        const isPatient = appointment.patientId === userId;
        const isAdmin = req.user!.role === "admin";

        if (!isDoctor && !isPatient && !isAdmin) {
            // --- IMPROVED AUTHORIZATION LOGGING ---
            console.log(`❌ User not authorized. 
                 Target Doctor ID: ${appointment.doctorId}, 
                 Target Patient ID: ${appointment.patientId}, 
                 Current User ID: ${userId}, 
                 Current User Role: ${req.user!.role}`);
            // --- END LOG ---
            return res.status(403).json({ message: "Not authorized to access this appointment" });
        }

        // If the user is the patient or admin, enrich the data with doctor profile picture
        if (isPatient || isAdmin) {
            const doctorUser = await storage.getUser(appointment.doctorId);
            const doctorProfile = await storage.getDoctorProfile(appointment.doctorId);

            const enrichedAppointment = {
                ...(appointment.toObject ? appointment.toObject() : appointment),
                doctor: {
                    _id: doctorUser?._id,
                    firstName: doctorUser?.firstName,
                    lastName: doctorUser?.lastName,
                    profilePicture: buildFullImageUrl(doctorProfile?.profilePicture),
                    specialization: doctorProfile?.specialization,
                    consultationFee: doctorProfile?.consultationFee,
                },
            };

            console.log(`✅ Appointment retrieved (enriched for patient/admin)`);
            return res.json(enrichedAppointment);
        }

        // If the user is the doctor, return the raw appointment object
        console.log(`✅ Appointment retrieved`);
        res.json(appointment);

    } catch (error: any) {
        console.error(`❌ FATAL ERROR: GET /api/appointments/:id for ${req.params.id} failed:`, error);
        res.status(500).json({ 
            message: error.message || "Failed to fetch appointment",
            appointmentId: req.params.id
        });
    }
});

    

    app.put("/api/appointments/:id", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            } // Sanitize and validate the appointment ID

            const appointmentId = sanitizeObjectId(req.params.id, "appointment ID");

            const appointment = await storage.getAppointment(appointmentId);
            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            } // Check permissions

            if (
                req.user!.role === "patient" &&
                appointment.patientId !== req.user!._id.toString()
            ) {
                return res.status(403).json({ message: "Access denied" });
            }
            if (
                req.user!.role === "doctor" &&
                appointment.doctorId !== req.user!._id.toString()
            ) {
                return res.status(403).json({ message: "Access denied" });
            } // Define allowed fields for each role

            const allowedFields = {
                patient: ["notes", "status"], // Patients can only update notes and status
                doctor: ["notes", "prescription", "status"], // Doctors can update notes, prescription, and status
                admin: [
                    "notes",
                    "prescription",
                    "status",
                    "appointmentDate",
                    "duration",
                    "type",
                ], // Admins have broader access
            }; // Filter request body to only include allowed fields

            const userRole = req.user!.role as keyof typeof allowedFields;
            const allowedFieldsForRole = allowedFields[userRole] || [];

            const filteredUpdates: any = {};
            for (const field of allowedFieldsForRole) {
                if (req.body[field] !== undefined) {
                    filteredUpdates[field] = req.body[field];
                }
            } // Additional validation for specific fields

            const validStatuses = [
                "scheduled",
                "completed",
                "cancelled",
                "no-show",
                "awaiting_payment",
                "confirmed",
                "pending",
            ];
            if (
                filteredUpdates.status &&
                !validStatuses.includes(filteredUpdates.status)
            ) {
                return res.status(400).json({ message: "Invalid status value" });
            } // Prevent modification of critical financial fields

            const restrictedFields = ["consultationFee", "patientId", "doctorId"];
            for (const field of restrictedFields) {
                if (req.body[field] !== undefined) {
                    return res.status(403).json({ message: `Cannot modify ${field}` });
                }
            }

            const updatedAppointment = await storage.updateAppointment(
                appointmentId,
                filteredUpdates
            );
            res.json(updatedAppointment);
        } catch (error: any) {
            console.error("PUT /api/appointments/:id failed:", error); // Log error
            res.status(400).json({ message: error.message });
        }
    }); // ✅ CANCEL APPOINTMENT ROUTE

    app.post("/api/appointments/:id/cancel", async (req, res) => {
        try {
            console.log(`\n❌ [POST /api/appointments/:id/cancel]`);
            console.log(`    Appointment ID: ${req.params.id}`);

            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const appointmentId = req.params.id;
            const { reason } = req.body; // Optional cancellation reason // Fetch the appointment

            const appointment = await storage.getAppointment(appointmentId);
            if (!appointment) {
                console.log(`❌ Appointment not found`);
                return res.status(404).json({ message: "Appointment not found" });
            } // Check authorization (patient or doctor can cancel their own)

            const userId = req.user!._id.toString();
            const isPatient = appointment.patientId === userId;
            const isDoctor = appointment.doctorId === userId;
            const isAdmin = req.user!.role === "admin";

            if (!isPatient && !isDoctor && !isAdmin) {
                console.log(`❌ User not authorized to cancel this appointment`);
                return res
                    .status(403)
                    .json({ message: "Not authorized to cancel this appointment" });
            } // Check if already cancelled/completed

            if (
                appointment.status === "cancelled" ||
                appointment.status === "completed"
            ) {
                return res.status(400).json({
                    message: `Cannot cancel appointment with status: ${appointment.status}`,
                });
            } // Update appointment status to cancelled

            console.log(`💾 Updating appointment status to 'cancelled'`);
            const updatedAppointment = await storage.updateAppointment(
                appointmentId,
                {
                    status: "cancelled",
                    notes: reason ? `Cancelled: ${reason}` : "Appointment cancelled",
                }
            ); // Notify the other party

            const doctor = await storage.getUser(appointment.doctorId);
            const patient = await storage.getUser(appointment.patientId);

            if (isPatient) {
                // Patient cancelled, notify doctor
                await storage.createNotification({
                    recipientId: appointment.doctorId,
                    type: "appointment_cancelled",
                    title: "Appointment Cancelled",
                    message: `${patient?.firstName} ${
                        patient?.lastName
                    } cancelled their appointment on ${new Date(
                        appointment.appointmentDate
                    ).toLocaleDateString()}.`,
                    appointmentId: appointmentId,
                    appointmentDate: appointment.appointmentDate,
                    read: false,
                    createdAt: new Date(),
                    notificationChannels: ["email", "inapp"],
                });
            } else if (isDoctor) {
                // Doctor cancelled, notify patient
                await storage.createNotification({
                    recipientId: appointment.patientId,
                    type: "appointment_cancelled",
                    title: "Appointment Cancelled",
                    message: `Dr. ${doctor?.firstName} ${
                        doctor?.lastName
                    } cancelled your appointment on ${new Date(
                        appointment.appointmentDate
                    ).toLocaleDateString()}.`,
                    appointmentId: appointmentId,
                    appointmentDate: appointment.appointmentDate,
                    read: false,
                    createdAt: new Date(),
                    notificationChannels: ["email", "inapp"],
                });
            }

            console.log(`✅ Appointment cancelled successfully`);
            res.json({
                success: true,
                message: "Appointment cancelled successfully",
                appointment: updatedAppointment,
            });
        } catch (error: any) {
            console.error("❌ POST /api/appointments/:id/cancel failed:", error);
            res
                .status(500)
                .json({ message: error.message || "Failed to cancel appointment" });
        }
    }); // --- NEW APPOINTMENT FLOW ROUTES START HERE --- // ✅ 1. GET APPOINTMENT REQUESTS (Pending - Status: 'pending') // ⭐ CHANGED: Added patientProfilePicture conversion

    app.get("/api/doctor/appointment-requests", async (req, res) => {
        try {
            console.log("\n📋 [GET /api/doctor/appointment-requests]");

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res
                    .status(401)
                    .json({ message: "Authentication required or not a doctor" });
            }

            const doctorId = req.user!._id.toString(); // Fetch all appointments for the doctor and filter to those with status 'pending'

            const pendingAppointments = await storage.getAppointmentsByDoctor(
                doctorId
            );

            const appointmentRequests = pendingAppointments.filter(
                (apt: any) => apt.status === "pending"
            );

            console.log(`    Found ${appointmentRequests.length} pending requests`); // Enrich with patient details (assuming storage.getUser exists and is robust)

            const enrichedRequests = await Promise.all(
                appointmentRequests.map(async (apt: any) => {
                    const patient = await storage.getUser(apt.patientId); // ⭐ Fetch patient's profile picture if exists
                    const patientProfile = patient?.profilePicture
                        ? buildFullImageUrl(patient.profilePicture)
                        : null;
                    return {
                        _id: apt._id,
                        appointmentId: apt._id,
                        patientId: apt.patientId,
                        patientName: `${patient?.firstName} ${patient?.lastName}`,
                        patientEmail: patient?.email, // ⭐ ADDED THIS LINE if you want to show patient pic
                        patientProfilePicture: patientProfile,
                        requestDate: apt.createdAt,
                        preferredDate: apt.appointmentDate,
                        preferredTime: new Date(apt.appointmentDate).toLocaleTimeString(
                            "en-US",
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                            }
                        ),
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
    }); // ✅ 2. GET AWAITING PAYMENT APPOINTMENTS (Status: 'awaiting_payment') // ⭐ CHANGED: Added patientProfilePicture conversion

    app.get("/api/doctor/awaiting-payment-appointments", async (req, res) => {
        try {
            console.log("\n⏳ [GET /api/doctor/awaiting-payment-appointments]");

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res
                    .status(401)
                    .json({ message: "Authentication required or not a doctor" });
            }

            const doctorId = req.user!._id.toString(); // Fetch all appointments for the doctor and filter to those with status 'awaiting_payment'

            const allAppointments = await storage.getAppointmentsByDoctor(doctorId);

            const awaitingPaymentAppointments = allAppointments.filter(
                (apt: any) => apt.status === "awaiting_payment"
            );

            console.log(
                `    Found ${awaitingPaymentAppointments.length} appointments awaiting payment`
            ); // Enrich with patient details

            const enrichedAppointments = await Promise.all(
                awaitingPaymentAppointments.map(async (apt: any) => {
                    const patient = await storage.getUser(apt.patientId);
                    const patientProfile = patient?.profilePicture
                        ? buildFullImageUrl(patient.profilePicture)
                        : null;
                    return {
                        _id: apt._id,
                        appointmentId: apt._id,
                        patientId: apt.patientId,
                        patientName: `${patient?.firstName} ${patient?.lastName}`,
                        patientEmail: patient?.email, // ⭐ ADDED THIS LINE
                        patientProfilePicture: patientProfile,
                        appointmentDate: apt.appointmentDate,
                        appointmentTime: new Date(apt.appointmentDate).toLocaleTimeString(
                            "en-US",
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                            }
                        ),
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
            console.error(
                "❌ GET /api/doctor/awaiting-payment-appointments failed:",
                error
            );
            res.status(500).json({ message: error.message });
        }
    }); // ✅ 3. DOCTOR ACCEPT APPOINTMENT REQUEST (pending -> awaiting_payment)

    app.post("/api/doctor/appointment-requests/:id/accept", async (req, res) => {
        try {
            console.log(`\n✅ [POST /api/doctor/appointment-requests/:id/accept]`);
            console.log(`    appointmentId: ${req.params.id}`);

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res
                    .status(401)
                    .json({ message: "Authentication required or not a doctor" });
            }

            const appointmentId = req.params.id;
            const doctorId = req.user!._id.toString();

            const appointment = await storage.getAppointment(appointmentId);
            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }
            if (appointment.doctorId !== doctorId) {
                return res
                    .status(403)
                    .json({ message: "This appointment is not yours" });
            }
            if (appointment.status !== "pending") {
                return res
                    .status(400)
                    .json({ message: "Only pending requests can be accepted" });
            }

            const doctor = await storage.getUser(doctorId); // Update status to "awaiting_payment"

            await storage.updateAppointment(appointmentId, {
                status: "awaiting_payment",
            });

            console.log(`✅ Appointment status updated to: awaiting_payment`); // Send notification to patient

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
                message:
                    "Request accepted. Patient has been notified to proceed with payment.",
            });
        } catch (error: any) {
            console.error("❌ Error accepting appointment request:", error);
            res.status(500).json({ message: error.message });
        }
    }); // ✅ 4. DOCTOR REJECT APPOINTMENT REQUEST (pending -> cancelled)

    app.post("/api/doctor/appointment-requests/:id/reject", async (req, res) => {
        try {
            console.log(`\n❌ [POST /api/doctor/appointment-requests/:id/reject]`);

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res
                    .status(401)
                    .json({ message: "Authentication required or not a doctor" });
            }

            const appointmentId = req.params.id;
            const doctorId = req.user!._id.toString();
            const { reason } = req.body;

            const appointment = await storage.getAppointment(appointmentId);
            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }
            if (appointment.doctorId !== doctorId) {
                return res
                    .status(403)
                    .json({ message: "This appointment is not yours" });
            }
            if (appointment.status !== "pending") {
                return res
                    .status(400)
                    .json({ message: "Only pending requests can be rejected" });
            }

            const doctor = await storage.getUser(doctorId); // Update status to "cancelled"

            await storage.updateAppointment(appointmentId, {
                status: "cancelled",
                notes: `Rejected by doctor: ${reason || "No reason provided"}`,
            });

            console.log(`✅ Appointment rejected and cancelled`); // Send notification to patient

            await storage.createNotification({
                recipientId: appointment.patientId,
                type: "appointment_rejected",
                title: `Appointment Request Declined`,
                message: `Dr. ${doctor?.firstName} ${
                    doctor?.lastName
                } was unable to accept your appointment request. ${
                    reason ? `Reason: ${reason}` : ""
                }`,
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
    }); // =================================== // END - NEW APPOINTMENT SEPARATION ROUTES // =================================== // =================================== // NOTIFICATION ROUTES (Standard & Doctor Specific) // =================================== // ✅ Doctor’s Notification List (Used by frontend Notification Dashboard)

    app.get("/api/doctor/notifications", async (req, res) => {
        try {
            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res
                    .status(401)
                    .json({ message: "Authentication required or not a doctor" });
            }

            const doctorId = req.user!._id.toString(); // Fetch all appointments that require doctor action or patient payment

            const allAppointments = await storage.getAppointmentsByDoctor(doctorId);

            const filtered = allAppointments.filter(
                (a: any) => a.status === "pending" || a.status === "awaiting_payment"
            );

            res.json(filtered);
        } catch (error: any) {
            console.error("❌ GET /api/doctor/notifications failed:", error);
            res.status(500).json({ message: error.message });
        }
    }); // ⭐ DOCTOR DISMISS NOTIFICATION ROUTE (FIX for 404 Error) ⭐ // DELETE /api/doctor/notifications/:id - Dismiss a notification (non-appointment related)

    app.delete("/api/doctor/notifications/:id", async (req, res) => {
        try {
            console.log(
                `\n🗑️ [DELETE /api/doctor/notifications/:id] Attempting dismissal for ID: ${req.params.id}`
            );

            if (!req.isAuthenticated() || req.user!.role !== "doctor") {
                return res
                    .status(401)
                    .json({ message: "Authentication required or not a doctor" });
            }

            const appointmentId = req.params.id; // This is actually an appointment ID // Delete/dismiss the appointment instead

            const deleted = await storage.updateAppointment(appointmentId, {
                status: "dismissed", // Mark as dismissed
            });

            if (!deleted) {
                console.log(`❌ Appointment ID ${appointmentId} not found.`);
                return res.status(404).json({ message: "Appointment not found." });
            }

            console.log(`✅ Appointment dismissed successfully: ${appointmentId}`);
            res.json({
                success: true,
                message: "Notification dismissed successfully",
                deletedId: appointmentId,
            });
        } catch (error: any) {
            console.error("❌ DELETE /api/doctor/notifications/:id failed:", error);
            res
                .status(500)
                .json({ message: error.message || "Failed to dismiss notification" });
        }
    }); // POST /api/notifications - Create & send notification

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
            } = req.body; // ✅ FIX: Create a guaranteed array, using the default if the provided value is null or undefined

            const finalChannels = notificationChannels || ["email", "inapp"];

            if (!recipientId || !type || !title || !message) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            console.log("📢 [POST /api/notifications]");

            const recipient = await storage.getUser(recipientId);
            if (!recipient) {
                return res.status(404).json({ message: "Recipient not found" });
            } // Create in-app notification record

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
            }); // Send EMAIL if requested (Placeholder logic)

            if (finalChannels.includes("email")) {
                try {
                    console.log(`    📧 Email queued for ${recipient.email}`);
                } catch (error) {
                    console.error("⚠️ Email sending failed:", error);
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
    }); // GET /api/notifications - Get user's notifications

    app.get("/api/notifications", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const recipientId = req.user!._id.toString();

            const notifications = await storage.getNotificationsByRecipient(
                recipientId
            );

            res.json(notifications);
        } catch (error: any) {
            console.error("❌ GET /api/notifications failed:", error);
            res.status(500).json({ message: error.message });
        }
    }); // PUT /api/notifications/:id - Mark notification as read

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
    }); // DELETE /api/notifications/:id - Delete notification (Patient/Admin/General)

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
    }); // =================================== // END NOTIFICATION ROUTES // ================================== // Payment Routes // --- IN routes.ts (Manual Payout Model) ---

    app.post("/api/create-order", async (req, res) => {
        try {
            console.log("\n💳 [POST /api/create-order] START (Manual Payout Model)");

            if (!razorpay) {
                console.error("❌ Razorpay not initialized");
                return res.status(500).json({ message: "Razorpay not configured" });
            }
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const { amount, appointmentId, doctorId } = req.body; // 'amount' is still the base fee (e.g., 500)

            if (!amount || !appointmentId || !doctorId) {
                console.log("❌ Missing required fields");
                return res.status(400).json({
                    message: "Missing required fields: amount, appointmentId, doctorId",
                });
            } // 1. Fetch records and validation

            const appointment = await storage.getAppointment(appointmentId);
            const patientId = req.user!._id.toString();

            if (!appointment || appointment.patientId !== patientId) {
                console.log("❌ Appointment not found or ownership mismatch.");
                return res
                    .status(404)
                    .json({ message: "Appointment not found or unauthorized access." });
            } // 2. COMMISSION CALCULATION (15% Surcharge Model)

            const PLATFORM_RATE = 0.15;
            const BASE_FEE_RUPEES = parseFloat(amount); // Base Doctor fee (e.g., 500) // Calculate total amount the patient will be charged

            const totalPatientCharge = BASE_FEE_RUPEES * (1 + PLATFORM_RATE); // 500 * 1.15 = 575 // --- CALCULATE SPLIT FOR DATABASE RECORD ---

            const doctorAmountRupees = BASE_FEE_RUPEES; // 500
            const platformCutRupees = totalPatientCharge - BASE_FEE_RUPEES; // 75 // Convert total charge to rounded integer Paise for Razorpay API

            const totalAmountInPaise = Math.round(totalPatientCharge * 100); // 57500

            console.log(
                `✅ Calculated charge: Total Patient Charge: ${totalPatientCharge.toFixed(
                    2
                )}`
            );
            console.log(
                `✅ Database split: Doctor:${doctorAmountRupees.toFixed(
                    2
                )}, Platform:${platformCutRupees.toFixed(2)}`
            ); // 3. Create STANDARD Razorpay Order (NO transfers array)

            const receipt = `manual_${Date.now()}`;

            const options = {
                amount: totalAmountInPaise, // Patient pays the full 57500 Paise
                currency: "INR",
                receipt: receipt,
                notes: {
                    userId: patientId,
                    appointmentId: appointmentId,
                    doctorId: doctorId, // Add the split details here for easy manual lookup:
                    doctor_share: doctorAmountRupees.toFixed(2),
                    platform_fee: platformCutRupees.toFixed(2),
                },
            };

            let order;
            try {
                order = await razorpay!.orders.create(options);
                console.log("     ✅ Standard Razorpay order created:", order.id);
            } catch (razorpayError: any) {
                console.error("     ❌ Razorpay API Error:", razorpayError.description);
                return res.status(500).json({
                    message: `Razorpay API Error: ${
                        razorpayError.description || razorpayError.message
                    }`,
                });
            } // 4. Store Payment Record with split details

            try {
                const paymentData = {
                    appointmentId,
                    patientId: patientId,
                    doctorId: doctorId,
                    amount: totalPatientCharge,
                    platformFee: platformCutRupees,
                    doctorPayoutAmount: doctorAmountRupees,
                    status: "pending",
                    razorpayOrderId: order.id,
                    payoutStatus: "pending", // This MUST be set to 'pending' for manual payout
                };

                const payment = await storage.createPayment(paymentData);
                console.log(
                    "     ✅ Payment record created (Payout pending):",
                    payment._id
                );
            } catch (storageError: any) {
                console.error("     ❌ Storage error:", storageError);
                return res.status(500).json({
                    message: `Database error: ${
                        storageError.message || "Failed to create payment record"
                    }`,
                });
            } // 5. Success response

            const response = {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID,
                totalCharge: totalPatientCharge, // Send back the correct amount for the frontend
            };

            res.json(response);
            console.log("✅ [POST /api/create-order] COMPLETE\n");
        } catch (error: any) {
            console.error("\n❌ [POST /api/create-order] UNHANDLED ERROR:", error);
            res.status(500).json({
                message: error?.message || "Unknown server error.",
            });
        }
    }); // ✅ 5. CORRECTED PAYMENT CONFIRMATION ROUTE (awaiting_payment -> scheduled)

    app.post("/api/payments/confirm", async (req, res) => {
        try {
            console.log("\n💳 [POST /api/payments/confirm] START");
            console.log("     Body:", JSON.stringify(req.body, null, 2)); // 🛑 CRITICAL: Authentication check must return JSON

            if (!req.isAuthenticated()) {
                console.error("❌ /api/payments/confirm: User NOT authenticated.");
                return res.status(401).json({
                    message: "Authentication required for payment verification.",
                });
            }

            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
                req.body;

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                console.error("❌ Missing payment verification data");
                return res
                    .status(400)
                    .json({ message: "Missing required payment verification data" });
            }

            console.log("     ✓ All required fields present"); // Verify Razorpay signature

            console.log("     ✓ Verifying signature...");
            const body = razorpay_order_id + "|" + razorpay_payment_id; // 🔥 FIX: Added .trim() to eliminate invisible whitespace error

            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!.trim())
                .update(body)
                .digest("hex");

            if (razorpay_signature !== expectedSignature) {
                console.error("❌ Signature verification failed");
                return res.status(400).json({ message: "Invalid payment signature" });
            }

            console.log("     ✅ Signature verified"); // Get payment record

            console.log("     ✓ Fetching payment record...");
            const payment = await storage.getPaymentByOrderId(razorpay_order_id);

            if (!payment) {
                console.error("❌ Payment not found for order:", razorpay_order_id);
                return res
                    .status(404)
                    .json({ message: "Payment record not found in database." });
            } // --- Database Updates ---

            const updatedPayment = await storage.updatePaymentStatus(
                razorpay_order_id,
                "completed",
                razorpay_payment_id
            );
            const appointmentId = payment.appointmentId;
            const appointment = await storage.updateAppointment(appointmentId, {
                status: "scheduled",
            });
            const doctor = await storage.getUser(appointment.doctorId); // --- Notification ---

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
            }); // Send final success response (JSON)

            res.json({
                success: true,
                payment: updatedPayment,
                appointment,
                message: "Payment confirmed and appointment scheduled!",
            });
        } catch (error: any) {
            // Catch-all block for database or unexpected errors
            console.error("\n❌ [POST /api/payments/confirm] ERROR");
            console.error("     Error message:", error.message);
            console.error("     Stack:", error.stack); // Return a 500 JSON error

            res.status(500).json({
                message: `Internal server error during verification: ${
                    error.message || "Unknown error"
                }`,
            });
        }
    }); // Razorpay webhook for payment verification

    app.post("/api/razorpay-webhook", async (req, res) => {
        try {
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

            if (!webhookSecret) {
                return res.status(200).json({
                    status: "success",
                    message: "Webhook skipped (not configured)",
                });
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
                const { order_id, payment_id } = payload.payment.entity; // Update payment record status

                await storage.updatePaymentStatus(order_id, "completed", payment_id);
            }

            res.json({ status: "success" });
        } catch (error: any) {
            console.error("POST /api/razorpay-webhook failed:", error); // Log error
            res.status(500).json({ message: "Webhook error: " + error.message });
        }
    }); // ==================================

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
    }); // 🔍 DEBUG: Test appointment fetch

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
    }); // 🔍 DEBUG: Test authenticated user

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
    }); // Document Upload Routes

    app.post(
        "/api/doctor/documents",
        upload.single("document"),
        async (req, res) => {
            try {
                if (!req.isAuthenticated()) {
                    return res.status(401).json({ message: "Authentication required" });
                }

                if (req.user!.role !== "doctor") {
                    return res.status(403).json({ message: "Doctor access required" });
                }

                if (!req.file) {
                    console.error(
                        "POST /api/doctor/documents failed: req.file is missing."
                    );
                    return res.status(400).json({
                        message:
                            "No file uploaded. Please check the 'document' field name.",
                    });
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
        }
    ); //delete document doctor route

    app.delete("/api/doctor/documents/:id", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            if (req.user!.role !== "doctor") {
                return res.status(403).json({ message: "Doctor access required" });
            }

            const documentId = req.params.id;

            console.log(`\n🗑️  [DELETE /api/doctor/documents/:id]`); // Get all documents for this doctor

            const allDocuments = await storage.getDoctorDocuments(
                req.user!._id.toString()
            ); // Find the specific document

            const document = allDocuments.find(
                (doc: any) => doc._id.toString() === documentId
            );

            if (!document) {
                console.log(`❌ Document not found`);
                return res.status(404).json({ message: "Document not found" });
            } // Verify ownership

            const docDoctorId =
                document.doctorId instanceof Object
                    ? document.doctorId.toString()
                    : document.doctorId;

            if (docDoctorId !== req.user!._id.toString()) {
                console.log(`❌ Access denied - document belongs to different doctor`);
                return res.status(403).json({ message: "Access denied" });
            } // Delete from storage (which handles both file and DB deletion)

            console.log(`    Calling storage.deleteDoctorDocument...`);
            const deletedDoc = await storage.deleteDoctorDocument(documentId);

            if (!deletedDoc) {
                console.log(`❌ Failed to delete from storage`);
                return res
                    .status(500)
                    .json({ message: "Failed to delete document from database" });
            }

            console.log(`✅ Document deleted successfully`);
            return res.json({ message: "Document deleted successfully", documentId });
        } catch (error: any) {
            console.error(
                `❌ DELETE /api/doctor/documents/:id failed:`,
                error.message
            );
            console.error(`    Stack:`, error.stack);
            res
                .status(500)
                .json({ message: error.message || "Failed to delete document" });
        }
    });

    // ===================================
    app.get("/api/doctor/documents", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            } // FIX: Rely only on authenticated user ID

            const doctorId =
                req.user!.role === "doctor"
                    ? req.user!._id.toString()
                    : (req.query.doctorId as string);

            if (!doctorId) {
                return res
                    .status(400)
                    .json({ message: "Authenticated Doctor ID is required" });
            }

            const documents = await storage.getDoctorDocuments(doctorId);
            res.json(documents);
        } catch (error: any) {
            console.error("GET /api/doctor/documents failed:", error); // Log error // If the error message is generic, we return 500
            res.status(500).json({ message: error.message });
        }
    });

    // Patient Records Routes

    app.post("/api/patient/records",upload.single("record"),
        async (req, res) => {
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
                        req.user!.role === "patient"
                            ? req.user!._id.toString()
                            : req.body.patientId,
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
        }
    );

// ========================================
    // 1. GENERATE VIDEO TOKEN FOR CONSULTATION
    // ========================================


// ========================================
// CREATE VIDEO SESSION FOR APPOINTMENT (FIXED)
// ========================================
app.post("/api/appointments/:id/create-video-session", async (req, res) => {
    try {
        console.log(`\n🎥 [POST /api/appointments/:id/create-video-session]`);
        
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const appointmentId = req.params.id;

        // 1. Basic Validation
        if (!appointmentId || appointmentId === "undefined" || appointmentId.length < 24) {
            return res.status(400).json({ message: "Invalid appointment ID format" });
        }

        const appointment = await storage.getAppointment(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // 2. Authorization Check
        const userId = req.user!._id.toString();
        if (appointment.doctorId !== userId && appointment.patientId !== userId) {
            return res.status(403).json({ message: "Unauthorized participant" });
        }

        // 3. DETERMINISTIC ROOM NAME (The Fix)
        // We use a prefix + the unique Appointment ID. 
        // No timestamps, no random bytes. Both users will always generate this exact string.
        const persistentRoomName = `apt_${appointmentId}`;

        // 4. Update the Database
        // We store this once. Even if multiple requests hit, they all save the same string.
        const updatedAppointment = await storage.updateAppointment(appointmentId, {
            videoSessionId: persistentRoomName,
            roomName: persistentRoomName, // Ensure your schema supports roomName
            videoSessionCreatedAt: new Date(),
        });

        console.log(`✅ Room synchronized for Appointment ${appointmentId}: ${persistentRoomName}`);

        res.status(200).json({
            success: true,
            videoSessionId: persistentRoomName,
            roomName: persistentRoomName,
            appointmentId: appointmentId,
            message: "Video session synchronized successfully"
        });

    } catch (error: any) {
        console.error("❌ create-video-session failed:", error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
});

// ========================================
// 1. GENERATE VIDEO TOKEN FOR CONSULTATION (UPDATED)
// ========================================
// ========================================
// GENERATE VIDEO TOKEN FOR CONSULTATION (ROBUST VERSION)
// ========================================
app.post("/api/video-token", async (req, res) => {
    try {
        console.log("\n🎥 [POST /api/video-token] START");

        if (!req.isAuthenticated()) {
            console.log("❌ User not authenticated");
            return res.status(401).json({ message: "Authentication required" });
        }

        const { appointmentId, roomName: requestedRoomName } = req.body;

        if (!appointmentId) {
            console.log("❌ Missing appointmentId");
            return res.status(400).json({ message: "appointmentId is required" });
        }

        // 1. Fetch the appointment
        console.log(`    📋 Verifying appointment ${appointmentId}...`);
        let appointment = await storage.getAppointment(appointmentId);

        if (!appointment) {
            console.log("❌ Appointment not found");
            return res.status(404).json({ message: "Appointment not found" });
        }

        // 2. SELF-HEALING LOGIC: If session ID is missing in DB, create it now
        // This prevents the "Video session ID missing" 400 error caused by race conditions.
        if (!appointment.videoSessionId) {
            console.log("⚠️ Video session ID missing in DB. Synchronizing now...");
            const persistentRoomName = `apt_${appointmentId}`;
            
            appointment = await storage.updateAppointment(appointmentId, {
                videoSessionId: persistentRoomName,
                roomName: persistentRoomName,
                videoSessionCreatedAt: new Date(),
            });
            console.log(`✅ Session synchronized on-the-fly: ${persistentRoomName}`);
        }

        // Use the validated roomName from the database
        const roomName = appointment.roomName || requestedRoomName || `apt_${appointmentId}`;

        // 3. Authorization Check
        const userId = req.user!._id.toString();
        const isDoctor = appointment.doctorId === userId;
        const isPatient = appointment.patientId === userId;

        if (!isDoctor && !isPatient) {
            console.log("❌ User is not a participant");
            return res.status(403).json({ message: "Unauthorized participant" });
        }

        // 4. Verify Twilio Configuration
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_API_KEY || !process.env.TWILIO_API_SECRET) {
            console.error("❌ Twilio credentials missing in environment variables");
            return res.status(500).json({ message: "Video service configuration error" });
        }

        // 5. Generate Twilio Access Token
        console.log(`🔑 Generating token for Room: ${roomName}`);
        const userIdentity = `${req.user!.firstName} ${req.user!.lastName}`;
        const userRoleLabel = req.user!.role === "doctor" ? "Doctor" : "Patient";
        const fullIdentity = `${userRoleLabel}: ${userIdentity}`;

        const AccessToken = twilio.jwt.AccessToken;
        const VideoGrant = AccessToken.VideoGrant;

        const token = new AccessToken(
            process.env.TWILIO_ACCOUNT_SID!,
            process.env.TWILIO_API_KEY!,
            process.env.TWILIO_API_SECRET!,
            {
                ttl: 3600, // Token valid for 1 hour
                identity: fullIdentity,
            }
        );

        // Add the Video Grant to the token
        const videoGrant = new VideoGrant({ room: roomName });
        token.addGrant(videoGrant);

        console.log(`✅ Token successfully generated for ${fullIdentity}`);
        console.log("=====================================\n");

        // 6. Return response to frontend
        return res.json({
            token: token.toJwt(),
            roomName: roomName,
            identity: fullIdentity,
            appointmentId: appointmentId,
            videoSessionId: appointment.videoSessionId,
            userRole: req.user!.role,
        });

    } catch (error: any) {
        console.error("❌ POST /api/video-token failed:", error);
        return res.status(500).json({
            message: error.message || "Failed to generate video token",
        });
    }
});

// ========================================
// 2. START VIDEO CALL (ENHANCED - Tracks both doctor and patient joining)
// ========================================
app.post("/api/appointments/:id/start-call", async (req, res) => {
    try {
        console.log(`\n📞 [POST /api/appointments/:id/start-call]`);
        console.log(`    Appointment ID: ${req.params.id}`);

        if (!req.isAuthenticated()) {
            console.log("❌ Not authenticated");
            return res.status(401).json({ message: "Authentication required" });
        }

        const appointmentId = req.params.id;
        const appointment = await storage.getAppointment(appointmentId);

        if (!appointment) {
            console.log("❌ Appointment not found");
            return res.status(404).json({ message: "Appointment not found" });
        }

        const userId = req.user!._id.toString();
        const isDoctor = appointment.doctorId === userId;
        const isPatient = appointment.patientId === userId;

        if (!isDoctor && !isPatient) {
            console.log("❌ User not authorized for this appointment");
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Update appointment status
        console.log(`💾 Updating appointment status to 'in-progress'`);
        const updates: any = {
            status: "in-progress",
            callStartedAt: new Date(),
        };

        // Track who joined and when (BOTH DOCTOR AND PATIENT)
        if (isDoctor) {
            updates.doctorJoinedAt = new Date();
            console.log(`✅ [DOCTOR JOINED] at: ${updates.doctorJoinedAt}`);
            console.log(`    Doctor ID: ${userId}`);
        }

        if (isPatient) {
            updates.patientJoinedAt = new Date();
            console.log(`✅ [PATIENT JOINED] at: ${updates.patientJoinedAt}`);
            console.log(`    Patient ID: ${userId}`);
        }

        const updatedAppointment = await storage.updateAppointment(
            appointmentId,
            updates
        );

        console.log(`✅ Appointment updated successfully`);
        console.log("=====================================\n");

        res.json({
            success: true,
            message: "Call started",
            appointment: updatedAppointment,
            participant: isDoctor ? "doctor" : "patient",
            joinedAt: isDoctor ? updates.doctorJoinedAt : updates.patientJoinedAt,
        });
    } catch (error: any) {
        console.error("❌ POST /api/appointments/:id/start-call failed:", error);
        res
            .status(500)
            .json({ message: error.message || "Failed to start call" });
    }
});

// ========================================
// 3. END VIDEO CALL (ENHANCED - Full call completion with metrics)
// ========================================
// File: server/routes.ts (in the end-call endpoint)
// Around line 4200+ where you handle POST /api/appointments/:id/end-call

app.post("/api/appointments/:id/end-call", async (req, res) => {
    try {
        console.log(`\n🔚 [POST /api/appointments/:id/end-call]`);
        console.log(`    Appointment ID: ${req.params.id}`);

        if (!req.isAuthenticated()) {
            console.log("❌ Not authenticated");
            return res.status(401).json({ message: "Authentication required" });
        }

        const appointmentId = req.params.id;
        const {
            duration,  // ✅ THIS IS THE CALL DURATION IN SECONDS
            notes,
            prescription,
            recordingUrl,
            callQuality,
            participantStats,
        } = req.body;

        // ✅ FIX: Log the duration to debug
        console.log(`    Call Duration (seconds): ${duration}`);
        console.log(`    Type of duration: ${typeof duration}`);

        const appointment = await storage.getAppointment(appointmentId);

        if (!appointment) {
            console.log("❌ Appointment not found");
            return res.status(404).json({ message: "Appointment not found" });
        }

        const userId = req.user!._id.toString();
        const isDoctor = appointment.doctorId === userId;
        const isPatient = appointment.patientId === userId;

        if (!isDoctor && !isPatient) {
            console.log("❌ User not authorized");
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Prepare comprehensive updates
        const updates: any = {
            status: "completed",
            callEndedAt: new Date(),
            callDuration: duration || 0, // ✅ Store duration in seconds
        };

        // Track who left
        if (isDoctor) {
            updates.doctorLeftAt = new Date();
            if (notes) updates.notes = notes;
            if (prescription) updates.prescription = prescription;
            console.log(`    [DOCTOR LEFT] at: ${updates.doctorLeftAt}`);
        } else {
            updates.patientLeftAt = new Date();
            console.log(`    [PATIENT LEFT] at: ${updates.patientLeftAt}`);
        }

        if (recordingUrl) {
            updates.recordingUrl = recordingUrl;
            console.log(`    📹 Recording URL stored: ${recordingUrl}`);
        }

        if (callQuality) {
            updates.callQuality = {
                rating: callQuality.rating,
                status: callQuality.status,
                avgBitrate: callQuality.avgBitrate,
                avgFramerate: callQuality.avgFramerate,
                audioLevel: callQuality.audioLevel,
                videoResolution: callQuality.videoResolution,
                packetLoss: callQuality.packetLoss,
            };
            console.log(`    📊 Call Quality Metrics Stored:`, updates.callQuality);
        }

        if (participantStats) {
            updates.participantStats = {
                doctorDuration: participantStats.doctorDuration,
                patientDuration: participantStats.patientDuration,
                doctorJoinTime: participantStats.doctorJoinTime,
                patientJoinTime: participantStats.patientJoinTime,
                reconnectionCount: participantStats.reconnectionCount,
            };
            console.log(`    👥 Participant Stats Stored:`, updates.participantStats);
        }

        // Calculate actual duration from timestamps if available
        if (appointment.doctorJoinedAt && appointment.patientJoinedAt) {
            const doctorTime = new Date(appointment.doctorJoinedAt).getTime();
            const patientTime = new Date(appointment.patientJoinedAt).getTime();
            const actualStart = Math.min(doctorTime, patientTime);
            const actualEnd = new Date().getTime();
            const actualDuration = Math.floor((actualEnd - actualStart) / 1000);
            updates.actualCallDuration = actualDuration;
            console.log(
                `    ⏱️  Calculated actual duration: ${actualDuration} seconds`
            );
        }

        console.log(`💾 Updating appointment to completed`);
        const updatedAppointment = await storage.updateAppointment(
            appointmentId,
            updates
        );

        // Notify both parties
        const doctor = await storage.getUser(appointment.doctorId);
        const patient = await storage.getUser(appointment.patientId);

        // ✅ FIX: Format duration correctly (duration is in seconds)
        const durationInSeconds = duration || 0;
        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = durationInSeconds % 60;
        const formattedDuration = `${minutes}m ${seconds}s`;

        console.log(`📢 Sending completion notifications`);
        console.log(`    Formatted duration: ${formattedDuration}`);

        // Notification to patient with metrics
        await storage.createNotification({
            recipientId: appointment.patientId,
            type: "consultation_completed",
            title: "Consultation Completed",
            message: `Your consultation with Dr. ${doctor?.firstName} ${
                doctor?.lastName
            } has been completed. Duration: ${formattedDuration}`, // ✅ USE FORMATTED DURATION
            appointmentId: appointmentId,
            appointmentDate: appointment.appointmentDate,
            callDuration: duration,
            recordingUrl: recordingUrl,
            read: false,
            createdAt: new Date(),
            notificationChannels: ["email", "inapp"],
        });

        // Notification to doctor with metrics
        await storage.createNotification({
            recipientId: appointment.doctorId,
            type: "consultation_completed",
            title: "Consultation Completed",
            message: `Your consultation with ${patient?.firstName} ${
                patient?.lastName
            } has been completed. Duration: ${formattedDuration}`, // ✅ USE FORMATTED DURATION
            appointmentId: appointmentId,
            appointmentDate: appointment.appointmentDate,
            callDuration: duration,
            recordingUrl: recordingUrl,
            read: false,
            createdAt: new Date(),
            notificationChannels: ["email", "inapp"],
        });

        console.log(`✅ Call ended successfully`);
        console.log("=====================================\n");

        res.json({
            success: true,
            message: "Call ended and appointment completed",
            appointment: updatedAppointment,
            metrics: {
                callDuration: durationInSeconds,
                formattedDuration: formattedDuration, // ✅ RETURN FORMATTED VERSION
                actualDuration: updates.actualCallDuration,
                quality: callQuality,
                recording: recordingUrl ? "Available" : "Not recorded",
            },
        });
    } catch (error: any) {
        console.error("❌ POST /api/appointments/:id/end-call failed:", error);
        res
            .status(500)
            .json({ message: error.message || "Failed to end call" });
    }
});

// ========================================
// 4. GET CALL STATUS (ENHANCED - Shows both participants)
// ========================================
app.get("/api/appointments/:id/call-status", async (req, res) => {
    try {
        console.log(`\n📊 [GET /api/appointments/:id/call-status]`);

        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const appointmentId = req.params.id;
        const appointment = await storage.getAppointment(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        const userId = req.user!._id.toString();
        const isDoctor = appointment.doctorId === userId;
        const isPatient = appointment.patientId === userId;

        if (!isDoctor && !isPatient) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Check if both participants have joined
        const doctorJoined = !!appointment.doctorJoinedAt;
        const patientJoined = !!appointment.patientJoinedAt;
        const bothJoined = doctorJoined && patientJoined;

        // Calculate real-time call duration
        let currentCallDuration = 0;
        if (bothJoined && appointment.callStartedAt) {
            const startTime = new Date(
                Math.min(
                    new Date(appointment.doctorJoinedAt!).getTime(),
                    new Date(appointment.patientJoinedAt!).getTime()
                )
            );
            currentCallDuration = Math.floor(
                (new Date().getTime() - startTime.getTime()) / 1000
            );
        }

        console.log(`    Status: ${appointment.status}`);
        console.log(`    Doctor joined: ${doctorJoined}`);
        console.log(`    Patient joined: ${patientJoined}`);
        console.log(`    Both joined: ${bothJoined}`);
        console.log(`    Current duration: ${currentCallDuration}s`);

        // Get the other participant info
        const otherParticipantJoined = isDoctor ? patientJoined : doctorJoined;
        const otherParticipantId = isDoctor
            ? appointment.patientId
            : appointment.doctorId;
        const otherParticipant = await storage.getUser(otherParticipantId);

        res.json({
            appointmentId: appointmentId,
            status: appointment.status,
            doctorJoined: doctorJoined,
            patientJoined: patientJoined,
            bothJoined: bothJoined,
            otherParticipantJoined: otherParticipantJoined,
            otherParticipant: {
                id: otherParticipant?._id,
                name: `${otherParticipant?.firstName} ${otherParticipant?.lastName}`,
                role: otherParticipant?.role,
            },
            callStartedAt:
                appointment.doctorJoinedAt || appointment.patientJoinedAt || null,
            callDuration: appointment.callDuration || 0,
            currentDuration: currentCallDuration,
            doctorJoinedAt: doctorJoined ? appointment.doctorJoinedAt : null,
            patientJoinedAt: patientJoined ? appointment.patientJoinedAt : null,
            recordingUrl: appointment.recordingUrl || null,
            callQuality: appointment.callQuality || null,
        });
    } catch (error: any) {
        console.error("❌ GET /api/appointments/:id/call-status failed:", error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// 5. VALIDATE VIDEO CALL ELIGIBILITY (UNCHANGED)
// ========================================
app.get("/api/appointments/:id/can-start-call", async (req, res) => {
    try {
        console.log(`\n✅ [GET /api/appointments/:id/can-start-call]`);

        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const appointmentId = req.params.id;

        if (
            !appointmentId ||
            appointmentId === "undefined" ||
            appointmentId.length === 0
        ) {
            console.error("❌ Invalid appointment ID:", appointmentId);
            return res.status(400).json({
                message: "Invalid appointment ID provided",
                receivedId: appointmentId,
            });
        }

        const appointment = await storage.getAppointment(appointmentId);

        if (!appointment) {
            console.log("❌ Appointment not found");
            return res.status(404).json({ message: "Appointment not found" });
        }

        const userId = req.user!._id.toString();
        const isDoctor = appointment.doctorId === userId;
        const isPatient = appointment.patientId === userId;

        if (!isDoctor && !isPatient) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const validStatuses = ["scheduled", "confirmed", "in-progress"];
        const statusValid = validStatuses.includes(appointment.status);

        const now = new Date();
        const appointmentTime = new Date(appointment.appointmentDate);
        const minutesBefore =
            (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
        
        // --- IMPROVED TIMING LOGIC ---
        const minutesAfter = (now.getTime() - appointmentTime.getTime()) / (1000 * 60);
        const LATE_BUFFER_MINUTES = 30; // Keep the desired 30-minute window
        const EARLY_JOIN_MINUTES = 15; // Allows joining 15 minutes before

        const timingValid =
            // 1. Check if we are early (or exactly at the 15 min mark before start)
            minutesBefore >= 0 && minutesBefore <= EARLY_JOIN_MINUTES ||
            
            // 2. Check if we are late (or exactly at the start time) up to the buffer limit
            (minutesAfter >= 0 && minutesAfter <= LATE_BUFFER_MINUTES);

        const canStart = statusValid && timingValid;
        // --- END IMPROVED TIMING LOGIC ---

        console.log(`    Status: ${appointment.status} (valid: ${statusValid})`);
        console.log(`    Minutes before: ${minutesBefore.toFixed(1)}`);
        console.log(`    Minutes after: ${minutesAfter.toFixed(1)}`);
        console.log(`    Can start call: ${canStart}`);

        res.json({
            canStartCall: canStart,
            reason: !statusValid
                ? `Cannot start call with status: ${appointment.status}`
                : minutesBefore > EARLY_JOIN_MINUTES && minutesAfter < 0
                ? `Call available ${EARLY_JOIN_MINUTES} mins before appointment (${Math.abs(
                      minutesBefore
                  ).toFixed(0)} mins to go)`
                : minutesAfter > LATE_BUFFER_MINUTES
                ? `Appointment window has closed (${minutesAfter.toFixed(
                      0
                  )} minutes ago)`
                : "Ready to start",
            status: appointment.status,
            minutesUntilAppointment: minutesBefore.toFixed(1),
            minutesSinceStart: minutesAfter.toFixed(1),
            appointmentTime: appointmentTime,
            lateJoiningAllowed:
                minutesAfter >= 0 && minutesAfter <= LATE_BUFFER_MINUTES,
        });
    } catch (error: any) {
        console.error(
            "❌ GET /api/appointments/:id/can-start-call failed:",
            error
        );
        res.status(500).json({
            message: error.message,
            stack:
                process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
});

// ========================================
// 6. GET RECORDING URL (NEW)
// ========================================
app.get("/api/appointments/:id/recording", async (req, res) => {
    try {
        console.log(`\n📹 [GET /api/appointments/:id/recording]`);

        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const appointmentId = req.params.id;
        const appointment = await storage.getAppointment(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        const userId = req.user!._id.toString();
        const isDoctor = appointment.doctorId === userId;
        const isPatient = appointment.patientId === userId;
        const isAdmin = req.user!.role === "admin";

        if (!isDoctor && !isPatient && !isAdmin) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (!appointment.recordingUrl) {
            return res.status(404).json({
                message: "No recording available for this appointment",
            });
        }

        console.log(`    ✅ Recording URL retrieved`);

        res.json({
            appointmentId: appointmentId,
            recordingUrl: appointment.recordingUrl,
            callDuration: appointment.callDuration,
            recordedAt: appointment.callEndedAt,
        });
    } catch (error: any) {
        console.error("❌ GET /api/appointments/:id/recording failed:", error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// 7. GET CALL QUALITY REPORT (NEW)
// ========================================
app.get("/api/appointments/:id/quality-report", async (req, res) => {
    try {
        console.log(`\n📊 [GET /api/appointments/:id/quality-report]`);

        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const appointmentId = req.params.id;
        const appointment = await storage.getAppointment(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        const userId = req.user!._id.toString();
        const isDoctor = appointment.doctorId === userId;
        const isPatient = appointment.patientId === userId;
        const isAdmin = req.user!.role === "admin";

        if (!isDoctor && !isPatient && !isAdmin) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const qualityData = {
            appointmentId: appointmentId,
            status: appointment.status,
            callDuration: appointment.callDuration,
            actualCallDuration: appointment.actualCallDuration,
            callQuality: appointment.callQuality || null,
            participantStats: appointment.participantStats || null,
            joinTimes: {
                doctorJoined: appointment.doctorJoinedAt,
                patientJoined: appointment.patientJoinedAt,
            },
            callTiming: {
                startedAt: appointment.callStartedAt,
                endedAt: appointment.callEndedAt,
            },
        };

        console.log(`    ✅ Quality report retrieved`);

        res.json(qualityData);
    } catch (error: any) {
        console.error(
            "❌ GET /api/appointments/:id/quality-report failed:",
            error
        );
        res.status(500).json({ message: error.message });
    }
});

// =================================== // ADMIN & DISPUTE ROUTES // =================================== // Admin Routes // ⭐ CHANGED: Added profile picture URL conversion

    app.get("/api/admin/pending-verifications", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            if (req.user!.role !== "admin") {
                return res.status(403).json({ message: "Admin access required" });
            } // FIX: Using getDoctorsWithProfiles (or equivalent) for efficiency

            const doctorsWithProfiles = await storage.getDoctorsWithProfiles();
            const pendingProfiles = doctorsWithProfiles
                .filter((doc: any) => !doc.profile?.isApproved)
                .map((doc: any) => ({
                    ...doc,
                    profile: doc.profile
                        ? {
                              ...doc.profile, // ⭐ ADDED THIS LINE
                              profilePicture: buildFullImageUrl(doc.profile.profilePicture),
                          }
                        : null,
                }));

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

            console.log(`    doctorUserId: ${doctorUserId}`); // Verify this is actually a doctor

            console.log(`    🔍 Looking up doctor user...`);
            const doctor = await storage.getUser(doctorUserId);
            if (!doctor) {
                console.log(`❌ Doctor user not found`);
                return res.status(404).json({ message: "Doctor user not found" });
            }

            if (doctor.role !== "doctor") {
                console.log(`❌ User is not a doctor. Role: ${doctor.role}`);
                return res.status(404).json({ message: "User is not a doctor" });
            } // Get current profile (required by updateDoctorProfile)

            console.log(`    🔍 Looking up doctor profile...`);
            const currentProfile = await storage.getDoctorProfile(doctorUserId); // Update the doctor profile's isApproved status

            console.log(`    💾 Updating profile with isApproved=${approved}...`);
            const profile = await storage.updateDoctorProfile(doctorUserId, {
                isApproved: approved,
            });

            console.log(`✅ Profile updated`);

            res.json(profile);
        } catch (error: any) {
            console.error(`\n❌ POST /api/admin/verify-doctor/:id failed:`);
            console.error(`    Error: ${error.message}`);
            console.error(`    Stack: ${error.stack}`);
            res.status(400).json({ message: error.message });
        }
    }); // Dispute Routes
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
                disputes = await (storage as any).getDisputesByUser(
                    req.user!._id.toString()
                );
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
    }); // Admin Routes for Real Data

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
    }); // ⭐ CHANGED: Added profile picture URL conversion

    app.get("/api/admin/doctors", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: "Authentication required" });
            }

            if (req.user!.role !== "admin") {
                return res.status(403).json({ message: "Admin access required" });
            }

            const doctors = await storage.getDoctorsWithProfiles(); // ⭐ ADD THIS - Convert all doctor profile pictures to full URLs

            const doctorsWithUrls = doctors.map((doc: any) => ({
                ...doc,
                profile: doc.profile
                    ? {
                          ...doc.profile,
                          profilePicture: buildFullImageUrl(doc.profile.profilePicture),
                      }
                    : null,
            }));

            res.json(doctorsWithUrls);
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
            } // FIX: Assuming getAllDocuments exists on the storage instance

            const documents = await (storage as any).getAllDocuments();
            res.json(documents);
        } catch (error: any) {
            console.error("GET /api/admin/documents failed:", error); // Log error // If the error message is generic, we return 500
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
            const user = await storage.updateUserVerification(
                req.params.id,
                verified
            );
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
            const document = await storage.updateDocumentVerification(
                req.params.id,
                verified,
                reason
            );
            res.json(document);
        } catch (error: any) {
            console.error("POST /api/admin/verify-document/:id failed:", error); // Log error
            res.status(400).json({ message: error.message });
        }
    }); // Analytics Routes

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
            const totalAppointments = await storage.getAllAppointments(); // Assuming getPaymentsByPatient with an empty string gets all payments if needed
            const allPayments = await storage.getPaymentsByPatient("");

            const analytics = {
                totalUsers: totalUsers.length,
                totalDoctors: totalDoctors.length,
                totalPatients: totalPatients.length,
                totalAppointments: totalAppointments.length,
                totalRevenue: allPayments.reduce(
                    (sum: number, payment: any) =>
                        sum + (payment.status === "completed" ? payment.amount : 0),
                    0
                ),
                monthlyAppointments: totalAppointments.filter((apt: any) => {
                    const aptDate = new Date(apt.createdAt || new Date());
                    const now = new Date();
                    return (
                        aptDate.getMonth() === now.getMonth() &&
                        aptDate.getFullYear() === now.getFullYear()
                    );
                }).length, // FIX: Using getDoctorsWithProfiles (or equivalent) for profile check
                pendingVerifications: (await storage.getDoctorsWithProfiles()).filter(
                    (doc: any) => !doc.profile?.isApproved
                ).length,
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