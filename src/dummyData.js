require("dotenv").config();
const mongoose = require("mongoose");
const UserStats = require("./models/UserStats"); // Adjust path if needed

// Generate a random timestamp within a specific month range
function getRandomDate(monthsAgo) {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  // Randomize the day of the month slightly
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date;
}

async function inject() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB for dummy data injection.");

    // 💡 REPLACE THIS WITH YOUR ACTUAL DISCORD USER ID
    const MY_DISCORD_ID = "660156869771264040";

    // Mocking 3 months of history with varied points allocations
    const dummyHistory = [
      // Month 1 (3 months ago)
      {
        triviaId: "mock_t1",
        option: 0,
        points: 4,
        timestamp: getRandomDate(3),
      },
      {
        triviaId: "mock_t2",
        option: 3,
        points: 0,
        timestamp: getRandomDate(3),
      },
      {
        triviaId: "mock_t3",
        option: 1,
        points: 2,
        timestamp: getRandomDate(3),
      },

      // Month 2 (2 months ago)
      {
        triviaId: "mock_t4",
        option: 0,
        points: 4,
        timestamp: getRandomDate(2),
      },
      {
        triviaId: "mock_t5",
        option: 2,
        points: 1,
        timestamp: getRandomDate(2),
      },

      // Month 3 (1 month ago to current)
      {
        triviaId: "mock_t6",
        option: 0,
        points: 4,
        timestamp: getRandomDate(1),
      },
      {
        triviaId: "mock_t7",
        option: 1,
        points: 2,
        timestamp: getRandomDate(0),
      },
    ];

    // Calculate total points from mock history
    const totalPoints = dummyHistory.reduce(
      (sum, record) => sum + record.points,
      0,
    );

    const result = await UserStats.findOneAndUpdate(
      { userId: MY_DISCORD_ID },
      {
        $set: {
          userId: MY_DISCORD_ID,
          username: "novagg00",
          totalPoints: totalPoints,
          triviaHistory: dummyHistory,
          joinedAt: getRandomDate(3), // Set profile join date to 3 months ago
        },
      },
      { upsert: true, new: true },
    );

    console.log("🚀 Dummy profile successfully established:");
    console.log(result);
  } catch (error) {
    console.error("❌ Injection script failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

inject();
