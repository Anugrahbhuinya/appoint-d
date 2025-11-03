import mongoose from "mongoose";
import { User, DoctorProfile } from "../../shared/mongodb-schema.js";

const MONGODB_URI = "mongodb+srv://Narayan:SupraMK4@cluster0.v9viv.mongodb.net/";


async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const userCount = await User.countDocuments();
  const doctorCount = await DoctorProfile.countDocuments();

  console.log("👥 Users:", userCount);
  console.log("🩺 DoctorProfiles:", doctorCount);

  const doctorUsers = await User.find({ role: "doctor" }).limit(5);
  console.log("🔍 Doctor users:", doctorUsers);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err);
});
