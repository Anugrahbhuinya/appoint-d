import mongoose from "mongoose";
import { User, DoctorProfile } from "@shared/mongodb-schema";

const uri = "mongodb+srv://Narayan:SupraMK4@cluster0.v9viv.mongodb.net/";

async function seedDoctor() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB Atlas");

    const doctor = await User.create({
      username: `dr_test_${Date.now()}`,
      email: "dr_test@example.com",
      password: "123456",
      role: "doctor",
      isVerified: true,
      isActive: true,
    });
    console.log("✅ Doctor created:", doctor._id);

    await DoctorProfile.create({
  userId: doctor._id,
  specialization: "Cardiology",
  experience: 5,
  consultationFee: 500, // ✅ fixed field name
  isApproved: true,
});

    console.log("🩺 Doctor profile created successfully");
  } catch (err) {
    console.error("❌ Error seeding doctor:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB Atlas");
  }
}

seedDoctor();
