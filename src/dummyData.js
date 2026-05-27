require("dotenv").config();
const mongoose = require("mongoose");
const UserStats = require("./models/UserStats");

async function wipeAllUserStats() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    const result = await UserStats.deleteMany({});

    console.log("🗑️ All UserStats deleted successfully.");
    console.log(`Deleted documents: ${result.deletedCount}`);
  } catch (error) {
    console.error("❌ Wipe failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

wipeAllUserStats();
