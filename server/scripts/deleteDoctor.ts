import mongoose from "mongoose";
import { User, DoctorProfile } from "@shared/mongodb-schema";

const MONGODB_URI = "mongodb+srv://Narayan:SupraMK4@cluster0.v9viv.mongodb.net/";

async function deleteDoctor() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("🗑️ Connected. Deleting test doctor...");

    // Delete doctor by username
    const user = await User.findOneAndDelete({ username: "dr_test" });

    if (user) {
      await DoctorProfile.findOneAndDelete({ userId: user._id });
      console.log("✅ Deleted doctor profile linked to user");
    } else {
      console.log("⚠️ No doctor found with username 'dr_test'");
    }

  } catch (error) {
    console.error("❌ Error deleting doctor:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected.");
  }
}

deleteDoctor();
